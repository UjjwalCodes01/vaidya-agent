/**
 * Healthcare Tool Definitions for Vaidya-Agent Phase 3
 * Comprehensive tool set for ABDM discovery, UHI booking, and healthcare coordination
 */

import { SchemaType } from '@google-cloud/vertexai';
import type { ToolFunction } from '../gcp/vertex-ai';

// ====================================
// ABDM Tools (Milestone M1/M2/M3)
// ====================================

export const SEARCH_ABDM_PATIENTS: ToolFunction = {
  name: "search_abdm_patients",
  description: "Search for patients in ABDM registry by health ID, mobile number, or demographics",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      healthId: {
        type: SchemaType.STRING,
        description: "ABHA Health ID (14-digit or username@abdm format)"
      },
      mobile: {
        type: SchemaType.STRING,
        description: "Mobile number for patient lookup"
      },
      name: {
        type: SchemaType.STRING,
        description: "Patient name for demographic search"
      },
      yearOfBirth: {
        type: SchemaType.STRING,
        description: "Year of birth for demographic filtering"
      },
      gender: {
        type: SchemaType.STRING,
        enum: ["M", "F", "O"],
        description: "Gender for demographic filtering"
      }
    },
    required: []
  }
};

export const SEARCH_ABDM_FACILITIES: ToolFunction = {
  name: "search_abdm_facilities",
  description: "Find healthcare facilities in ABDM registry with location-based filtering",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      gps: {
        type: SchemaType.STRING,
        description: "GPS coordinates in 'latitude,longitude' format"
      },
      city: {
        type: SchemaType.STRING,
        description: "City name for facility search"
      },
      state: {
        type: SchemaType.STRING,
        description: "State name for facility search"
      },
      facilityType: {
        type: SchemaType.STRING,
        enum: ["Hospital", "PHC", "CHC", "SubCenter", "Clinic", "Diagnostic"],
        description: "Type of healthcare facility"
      },
      radius: {
        type: SchemaType.NUMBER,
        description: "Search radius in kilometers (max 100km)",
      },
      specialization: {
        type: SchemaType.STRING,
        description: "Medical specialization or services offered"
      }
    },
    required: []
  }
};

export const MANAGE_HEALTH_CONSENT: ToolFunction = {
  name: "manage_health_consent",
  description: "Initiate ABDM M3 consent flow for health data access with FHIR compliance",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      patientAbhaAddress: {
        type: SchemaType.STRING,
        description: "Patient ABHA address for consent request"
      },
      purpose: {
        type: SchemaType.STRING,
        enum: ["CAREMGT", "BTG", "PUBHLTH", "HPAYMT", "DSRCH", "PATRQT"],
        description: "Purpose of health data access - CAREMGT: Care Management, BTG: Break the Glass, PUBHLTH: Public Health, HPAYMT: Healthcare Payment, DSRCH: Research, PATRQT: Patient Request"
      },
      hiTypes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["DiagnosticReport", "Prescription", "OPConsultation", "DischargeSummary", "ImmunizationRecord", "HealthDocumentRecord", "WellnessRecord"]
        },
        description: "Types of health information requested"
      },
      dateRangeFrom: {
        type: SchemaType.STRING,
        description: "Start date for data range (ISO 8601 format)"
      },
      dateRangeTo: {
        type: SchemaType.STRING,
        description: "End date for data range (ISO 8601 format)"
      },
      requesterName: {
        type: SchemaType.STRING,
        description: "Name of the healthcare provider requesting consent"
      },
      requesterIdentifier: {
        type: SchemaType.STRING,
        description: "HPR ID or other identifier of requesting provider"
      }
    },
    required: ["patientAbhaAddress", "purpose", "hiTypes"]
  }
};

// ====================================
// UHI Tools (Discovery, Selection, Booking)
// ====================================

export const DISCOVER_HEALTHCARE_PROVIDERS: ToolFunction = {
  name: "discover_healthcare_providers",
  description: "Find healthcare providers through UHI network with specialization and location filtering",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: {
        type: SchemaType.OBJECT,
        properties: {
          gps: {
            type: SchemaType.STRING,
            description: "GPS coordinates in 'latitude,longitude' format"
          },
          city: {
            type: SchemaType.STRING,
            description: "City name for provider search"
          },
          pincode: {
            type: SchemaType.STRING,
            description: "6-digit Indian postal code"
          }
        },
        description: "Location parameters for provider discovery"
      },
      category: {
        type: SchemaType.STRING,
        enum: ["Consultation", "Diagnostics", "Pharmacy", "Wellness"],
        description: "Healthcare service category"
      },
      fulfillmentType: {
        type: SchemaType.STRING,
        enum: ["Teleconsultation", "Physical"],
        description: "Type of service delivery - virtual or in-person"
      },
      specialization: {
        type: SchemaType.STRING,
        description: "Medical specialization (e.g., Cardiology, Pediatrics, General Medicine)"
      },
      availability: {
        type: SchemaType.STRING,
        description: "Preferred time slot (e.g., 'today', 'tomorrow', 'this_week')"
      },
      maxDistance: {
        type: SchemaType.NUMBER,
        description: "Maximum distance in kilometers for physical consultations",
      }
    },
    required: ["category", "fulfillmentType"]
  }
};

export const SELECT_HEALTHCARE_PROVIDER: ToolFunction = {
  name: "select_healthcare_provider",
  description: "Select a specific provider and service from UHI discovery results",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      providerId: {
        type: SchemaType.STRING,
        description: "Unique provider identifier from discovery results"
      },
      itemId: {
        type: SchemaType.STRING,
        description: "Specific service/item ID offered by the provider"
      },
      transactionId: {
        type: SchemaType.STRING,
        description: "UHI transaction identifier for this booking session"
      },
      preferredTimeSlot: {
        type: SchemaType.STRING,
        description: "Preferred appointment time (ISO 8601 format)"
      },
      patientDetails: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: "Patient full name"
          },
          age: {
            type: SchemaType.NUMBER,
            description: "Patient age in years"
          },
          gender: {
            type: SchemaType.STRING,
            enum: ["M", "F", "O"],
            description: "Patient gender"
          },
          mobile: {
            type: SchemaType.STRING,
            description: "Patient mobile number"
          }
        },
        description: "Patient information for appointment booking"
      }
    },
    required: ["providerId", "itemId", "transactionId"]
  }
};

export const BOOK_HEALTHCARE_APPOINTMENT: ToolFunction = {
  name: "book_healthcare_appointment",
  description: "Confirm and book a healthcare appointment through UHI network",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      providerId: {
        type: SchemaType.STRING,
        description: "Provider identifier from selection"
      },
      itemId: {
        type: SchemaType.STRING,
        description: "Service item identifier"
      },
      transactionId: {
        type: SchemaType.STRING,
        description: "UHI transaction identifier"
      },
      abhaAddress: {
        type: SchemaType.STRING,
        description: "Patient ABHA address for authentication"
      },
      appointmentTime: {
        type: SchemaType.STRING,
        description: "Confirmed appointment time (ISO 8601 format)"
      },
      paymentMethod: {
        type: SchemaType.STRING,
        enum: ["cash", "upi", "card", "insurance", "free"],
        description: "Payment method for the consultation"
      },
      symptoms: {
        type: SchemaType.STRING,
        description: "Brief description of symptoms or reason for visit"
      },
      emergencyContact: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: "Emergency contact name"
          },
          mobile: {
            type: SchemaType.STRING,
            description: "Emergency contact mobile number"
          },
          relation: {
            type: SchemaType.STRING,
            description: "Relationship to patient"
          }
        },
        description: "Emergency contact information"
      }
    },
    required: ["providerId", "itemId", "transactionId", "abhaAddress", "appointmentTime"]
  }
};

// ====================================
// Location and Maps Tools
// ====================================

export const FIND_NEAREST_PHC: ToolFunction = {
  name: "find_nearest_phc",
  description: "Find nearest Primary Health Centers (PHC) using Google Maps and ABDM facility registry",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      gps: {
        type: SchemaType.STRING,
        description: "Patient GPS coordinates in 'latitude,longitude' format"
      },
      radiusKm: {
        type: SchemaType.NUMBER,
        description: "Search radius in kilometers",
      },
      facilityTypes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["PHC", "CHC", "SubCenter", "Hospital"]
        },
        description: "Types of healthcare facilities to include",
      },
      includePrivate: {
        type: SchemaType.BOOLEAN,
        description: "Include private healthcare facilities",
      }
    },
    required: ["gps"]
  }
};

export const GET_FACILITY_DIRECTIONS: ToolFunction = {
  name: "get_facility_directions",
  description: "Get route planning and directions to a specific healthcare facility",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fromGPS: {
        type: SchemaType.STRING,
        description: "Starting location GPS coordinates"
      },
      facilityGPS: {
        type: SchemaType.STRING,
        description: "Healthcare facility GPS coordinates"
      },
      travelMode: {
        type: SchemaType.STRING,
        enum: ["driving", "walking", "transit", "bicycling"],
        description: "Mode of transportation",
      },
      avoidTolls: {
        type: SchemaType.BOOLEAN,
        description: "Avoid toll roads",
      },
      language: {
        type: SchemaType.STRING,
        enum: ["hi", "en", "bn", "te", "mr", "ta", "gu"],
        description: "Language for directions",
      }
    },
    required: ["fromGPS", "facilityGPS"]
  }
};

// ====================================
// Session and Context Management Tools
// ====================================

export const UPDATE_PATIENT_CONTEXT: ToolFunction = {
  name: "update_patient_context",
  description: "Update patient session context and medical information",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: {
        type: SchemaType.STRING,
        description: "Patient session identifier"
      },
      updates: {
        type: SchemaType.OBJECT,
        properties: {
          symptoms: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Updated symptom list"
          },
          suspectedConditions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Updated suspected medical conditions"
          },
          severity: {
            type: SchemaType.STRING,
            enum: ["low", "moderate", "high", "critical"],
            description: "Updated severity assessment"
          },
          recommendedAction: {
            type: SchemaType.STRING,
            description: "Updated recommended course of action"
          },
          appointmentBooked: {
            type: SchemaType.BOOLEAN,
            description: "Whether appointment has been successfully booked"
          },
          providerInfo: {
            type: SchemaType.OBJECT,
            description: "Information about selected healthcare provider"
          }
        },
        description: "Context updates to apply"
      }
    },
    required: ["sessionId", "updates"]
  }
};

export const ESCALATE_EMERGENCY: ToolFunction = {
  name: "escalate_emergency",
  description: "Immediate escalation for high-severity symptoms requiring urgent medical attention",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: {
        type: SchemaType.STRING,
        description: "Patient session identifier"
      },
      emergencyType: {
        type: SchemaType.STRING,
        enum: ["cardiac", "respiratory", "severe_bleeding", "unconscious", "severe_pain", "poisoning", "trauma", "other"],
        description: "Type of medical emergency"
      },
      symptoms: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Critical symptoms requiring immediate attention"
      },
      patientLocation: {
        type: SchemaType.STRING,
        description: "Patient GPS coordinates for emergency services"
      },
      contactNumber: {
        type: SchemaType.STRING,
        description: "Emergency contact number"
      },
      consciousness: {
        type: SchemaType.STRING,
        enum: ["conscious", "semi_conscious", "unconscious", "unknown"],
        description: "Patient consciousness level"
      },
      vitalSigns: {
        type: SchemaType.OBJECT,
        properties: {
          pulse: { type: SchemaType.STRING, description: "Pulse rate or description" },
          breathing: { type: SchemaType.STRING, description: "Breathing pattern" },
          temperature: { type: SchemaType.STRING, description: "Body temperature if available" }
        },
        description: "Available vital signs information"
      }
    },
    required: ["sessionId", "emergencyType", "symptoms"]
  }
};

// ====================================
// Tool Collections by Category
// ====================================

export const ABDM_TOOLS: ToolFunction[] = [
  SEARCH_ABDM_PATIENTS,
  SEARCH_ABDM_FACILITIES,
  MANAGE_HEALTH_CONSENT
];

export const UHI_TOOLS: ToolFunction[] = [
  DISCOVER_HEALTHCARE_PROVIDERS,
  SELECT_HEALTHCARE_PROVIDER,
  BOOK_HEALTHCARE_APPOINTMENT
];

export const LOCATION_TOOLS: ToolFunction[] = [
  FIND_NEAREST_PHC,
  GET_FACILITY_DIRECTIONS
];

export const SESSION_TOOLS: ToolFunction[] = [
  UPDATE_PATIENT_CONTEXT,
  ESCALATE_EMERGENCY
];

export const ALL_HEALTHCARE_TOOLS: ToolFunction[] = [
  ...ABDM_TOOLS,
  ...UHI_TOOLS,
  ...LOCATION_TOOLS,
  ...SESSION_TOOLS
];