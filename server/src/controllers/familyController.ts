import { Request, Response } from 'express';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { Visit, FamilyContact, FamilyToken, Patient, Stage } from '../models';
import { sendOTPEmail, sendOTPSms } from '../lib/mailer';

// Helper to generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate unique family token
const generateFamilyToken = (): string => {
  return 'fam_' + crypto.randomBytes(16).toString('hex');
};

const STAGE_ORDER = ['Arrived', 'Pre-Op Assessment', 'Ready for Theatre', 'In Theatre', 'Recovery', 'Discharged'];

// POST /family/request-otp - Request OTP for family access
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { visit_tracking_id, email, phone } = req.body;

    if (!visit_tracking_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_tracking_id is required'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone is required'
      });
    }

    // Find the visit
    const visit = await Visit.findOne({
      where: { visit_tracking_id },
      attributes: { include: ['discharge_note'] },
      include: [
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['name', 'color']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['first_name']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // If already discharged, no OTP needed — return status directly
    const currentStage = visit.get('current_stage') as any;
    const patient = visit.get('patient') as any;
    if (!visit.active || currentStage?.name === 'Discharged') {
      const currentIndex = STAGE_ORDER.indexOf(currentStage?.name ?? 'Discharged');
      return res.json({
        success: true,
        discharged: true,
        visit: {
          visit_tracking_id: visit.visit_tracking_id,
          patient_first_name: patient?.first_name ?? '',
          current_stage: {
            name: currentStage?.name ?? 'Discharged',
            color: currentStage?.color ?? '#95a5a6'
          },
          stage_progress_percent: currentIndex >= 0
            ? Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100)
            : 100,
          discharge_note: visit.discharge_note ?? null,
          updated_at: visit.updated_at
        }
      });
    }

    // Find family contact for this visit
    const contactWhere: any = { visit_id: visit.id };
    if (email) {
      contactWhere.email = email;
    } else if (phone) {
      contactWhere.phone = phone;
    }

    const familyContact = await FamilyContact.findOne({
      where: contactWhere
    });

    if (!familyContact) {
      return res.status(404).json({
        success: false,
        error: 'No family contact found with these details for this visit'
      });
    }

    if (!familyContact.consent_given) {
      return res.status(403).json({
        success: false,
        error: 'Patient has not consented to family tracking'
      });
    }

    // Check rate limiting - 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await FamilyToken.count({
      where: {
        family_contact_id: familyContact.id,
        created_at: { [Op.gte]: oneHourAgo }
      }
    });

    if (recentTokens >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many OTP requests. Please try again later.'
      });
    }

    // Generate OTP and token
    const otp = generateOTP();
    const token = generateFamilyToken();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await FamilyToken.create({
      family_contact_id: familyContact.id,
      visit_id: visit.id,
      token,
      otp,
      otp_expires_at: otpExpiresAt,
      otp_attempts: 0,
      token_expires_at: tokenExpiresAt,
      is_locked: false
    });

    const recipientEmail = familyContact.email;
    if (recipientEmail) {
      await sendOTPEmail(recipientEmail, otp, familyContact.name);
    } else {
      await sendOTPSms(familyContact.phone, otp, familyContact.name);
    }

    const maskedRecipient = recipientEmail
      ? recipientEmail.replace(/(.{1}).*(@.*)/, '$1***$2')
      : familyContact.phone.replace(/(\d{3})\d+(\d{3})/, '$1***$2');

    res.json({
      success: true,
      message: 'OTP sent successfully',
      delivery_method: recipientEmail ? 'email' : 'sms',
      masked_recipient: maskedRecipient,
      expires_in_minutes: 15
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /family/verify-otp - Verify OTP and get access token
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { visit_tracking_id, otp } = req.body;

    if (!visit_tracking_id || !otp) {
      return res.status(400).json({
        success: false,
        error: 'visit_tracking_id and otp are required'
      });
    }

    // Find the visit
    const visit = await Visit.findOne({
      where: { visit_tracking_id },
      attributes: { include: ['discharge_note'] },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['first_name']
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['name', 'color']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Find the most recent token for this visit
    const familyToken = await FamilyToken.findOne({
      where: { visit_id: visit.id },
      order: [['created_at', 'DESC']]
    });

    if (!familyToken) {
      return res.status(404).json({
        success: false,
        error: 'No OTP request found. Please request a new OTP.'
      });
    }

    // Check if locked
    if (familyToken.is_locked) {
      const lockedUntil = familyToken.locked_until;
      if (lockedUntil && new Date() < lockedUntil) {
        return res.status(423).json({
          success: false,
          error: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }
      familyToken.is_locked = false;
      familyToken.locked_until = null;
      familyToken.otp_attempts = 0;
      await familyToken.save();
    }

    // Check if OTP expired
    if (new Date() > familyToken.otp_expires_at) {
      return res.status(401).json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (familyToken.otp !== otp) {
      familyToken.otp_attempts += 1;

      if (familyToken.otp_attempts >= 3) {
        familyToken.is_locked = true;
        familyToken.locked_until = new Date(Date.now() + 30 * 60 * 1000);
        await familyToken.save();

        return res.status(423).json({
          success: false,
          error: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }

      await familyToken.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid OTP',
        attempts_remaining: 3 - familyToken.otp_attempts
      });
    }

    // OTP valid - reset attempts
    familyToken.otp_attempts = 0;
    await familyToken.save();

    const patient = visit.get('patient') as any;
    const currentStage = visit.get('current_stage') as any;
    const currentIndex = STAGE_ORDER.indexOf(currentStage.name);
    const stageProgressPercent = currentIndex >= 0
      ? Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100)
      : 0;

    res.json({
      success: true,
      access_token: familyToken.token,
      expires_at: familyToken.token_expires_at,
      visit: {
        visit_tracking_id: visit.visit_tracking_id,
        patient_first_name: patient.first_name,
        current_stage: {
          name: currentStage.name,
          color: currentStage.color
        },
        stage_progress_percent: stageProgressPercent,
        discharge_note: visit.discharge_note ?? null,
        updated_at: visit.updated_at
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /family/visit/:token - Get patient status (family view)
export const getVisitStatus = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const familyToken = await FamilyToken.findOne({
      where: { token },
      include: [
        {
          model: Visit,
          as: 'visit',
          attributes: { include: ['discharge_note'] },
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name']
            },
            {
              model: Stage,
              as: 'current_stage',
              attributes: ['name', 'color']
            }
          ]
        }
      ]
    });

    if (!familyToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (new Date() > familyToken.token_expires_at) {
      return res.status(401).json({
        success: false,
        error: 'Access token expired. Please request a new OTP.'
      });
    }

    const visit = familyToken.get('visit') as any;
    const patient = visit.patient;
    const currentStage = visit.current_stage;
    const currentIndex = STAGE_ORDER.indexOf(currentStage.name);
    const stageProgressPercent = currentIndex >= 0
      ? Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100)
      : 0;

    res.json({
      success: true,
      visit_tracking_id: visit.visit_tracking_id,
      patient_first_name: patient.first_name,
      current_stage: {
        name: currentStage.name,
        color: currentStage.color
      },
      stage_progress_percent: stageProgressPercent,
      discharge_note: visit.discharge_note ?? null,
      updated_at: visit.updated_at
    });
  } catch (error) {
    console.error('Get visit status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
