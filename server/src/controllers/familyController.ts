import { Request, Response } from 'express';
import crypto from 'crypto';
import { Visit, FamilyContact, FamilyToken, Patient, Stage } from '../models';
import { sendOTPEmail } from '../lib/mailer';

interface FamilyAuthRequest extends Request {
  familyToken?: {
    id: number;
    visit_id: number;
    family_contact_id: number;
  };
}

// Helper to generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate unique family token
const generateFamilyToken = (): string => {
  return 'fam_' + crypto.randomBytes(16).toString('hex');
};

// POST /family/request-otp - Request OTP for family access
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { phone, visit_tracking_id } = req.body;

    if (!phone || !visit_tracking_id) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and visit tracking ID are required'
      });
    }

    // Find visit with family contact
    const visit = await Visit.findOne({
      where: { visit_tracking_id, active: true },
      include: [
        {
          model: FamilyContact,
          as: 'family_contacts',
          where: { phone }
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found or no family contact registered'
      });
    }

    const familyContacts = visit.get('family_contacts') as any[];
    const familyContact = familyContacts[0];

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
        created_at: { $gte: oneHourAgo }
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

    // Create family token record
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

    const deliveryMethod = familyContact.email ? 'email' : 'sms';
    const maskedRecipient = familyContact.email
      ? familyContact.email.replace(/(.{1}).*(@.*)/, '$1***$2')
      : phone.replace(/(\+\d{3})\d+(\d{3})/, '$1***$2');

    if (deliveryMethod === 'email' && familyContact.email) {
      await sendOTPEmail(familyContact.email, otp, 'your relative');
    } else {
      // SMS gateway not yet integrated — log for development
      console.log(`[DEV] OTP SMS to ${phone}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      delivery_method: deliveryMethod,
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
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    // Find family contact
    const familyContact = await FamilyContact.findOne({
      where: { phone }
    });

    if (!familyContact) {
      return res.status(404).json({
        success: false,
        error: 'Family contact not found'
      });
    }

    // Find the most recent token
    const familyToken = await FamilyToken.findOne({
      where: {
        family_contact_id: familyContact.id
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Visit,
          as: 'visit',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name']
            }
          ]
        }
      ]
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
      } else {
        // Unlock if time has passed
        familyToken.is_locked = false;
        familyToken.locked_until = null;
        familyToken.otp_attempts = 0;
        await familyToken.save();
      }
    }

    // Check if OTP expired
    if (new Date() > familyToken.otp_expires_at) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    // Verify OTP
    if (familyToken.otp !== otp) {
      familyToken.otp_attempts += 1;

      if (familyToken.otp_attempts >= 3) {
        familyToken.is_locked = true;
        familyToken.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await familyToken.save();

        return res.status(423).json({
          success: false,
          error: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }

      await familyToken.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP',
        attempts_remaining: 3 - familyToken.otp_attempts
      });
    }

    // OTP is valid - reset attempts
    familyToken.otp_attempts = 0;
    await familyToken.save();

    const visit = familyToken.get('visit') as any;
    const patient = visit.patient;

    res.json({
      success: true,
      token: familyToken.token,
      expires_at: familyToken.token_expires_at,
      visit: {
        visit_tracking_id: visit.visit_tracking_id,
        patient_first_name: patient.first_name
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
export const getVisitStatus = async (req: FamilyAuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    // Verify token
    const familyToken = await FamilyToken.findOne({
      where: { token },
      include: [
        {
          model: Visit,
          as: 'visit',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name']
            },
            {
              model: Stage,
              as: 'current_stage',
              attributes: ['name', 'description', 'color']
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

    // Check if token expired
    if (new Date() > familyToken.token_expires_at) {
      return res.status(401).json({
        success: false,
        error: 'Access token expired. Please request a new OTP.'
      });
    }

    const visit = familyToken.get('visit') as any;
    const patient = visit.patient;
    const currentStage = visit.current_stage;

    const durationMinutes = Math.floor((Date.now() - new Date(visit.created_at).getTime()) / 60000);

    // Calculate progress percentage based on stage (simplified)
    const stageOrder = ['Arrived', 'Pre-Op Assessment', 'Ready for Theatre', 'In Theatre', 'Recovery', 'Discharged'];
    const currentIndex = stageOrder.indexOf(currentStage.name);
    const progressPercentage = currentIndex >= 0 ? Math.round(((currentIndex + 1) / stageOrder.length) * 100) : 0;

    res.json({
      success: true,
      patient: {
        first_name: patient.first_name
      },
      current_stage: {
        name: currentStage.name,
        description: currentStage.description,
        color: currentStage.color,
        duration_minutes: durationMinutes
      },
      progress_percentage: progressPercentage,
      last_updated: visit.updated_at,
      auto_refresh_seconds: 60
    });
  } catch (error) {
    console.error('Get visit status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
