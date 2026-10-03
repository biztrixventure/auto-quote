import { z } from "zod";
import { STATE_CODES } from "./states";

const currentYear = new Date().getFullYear();

function ageFrom(dob: string) {
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

// All form values are strings; the server converts them.
export const quoteFormSchema = z.object({
  // Step: location
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  state: z.string().refine((v) => STATE_CODES.includes(v), "Choose your state"),

  // Step: vehicle
  vehicleYear: z
    .string()
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1981 && n <= currentYear + 1;
    }, "Choose the vehicle year"),
  vehicleMake: z.string().min(1, "Choose the make"),
  vehicleModel: z.string().min(1, "Choose the model"),
  ownership: z.enum(["own", "finance", "lease"], { message: "Choose one" }),
  primaryUse: z.enum(["commute", "pleasure", "business"], { message: "Choose one" }),
  annualMiles: z.enum(["5000", "10000", "15000", "20000", "25000"], { message: "Choose one" }),

  // Step: driver
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  dateOfBirth: z
    .string()
    .refine((v) => {
      const a = ageFrom(v);
      return a >= 16 && a <= 100;
    }, "Drivers must be at least 16"),
  gender: z.enum(["female", "male", "nonbinary"], { message: "Choose one" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"], { message: "Choose one" }),

  // Step: history
  licenseStatus: z.enum(["valid", "permit", "suspended", "foreign"], { message: "Choose one" }),
  accidents: z.enum(["0", "1", "2", "3"], { message: "Choose one" }),
  violations: z.enum(["0", "1", "2", "3"], { message: "Choose one" }),

  // Step: insurance
  currentlyInsured: z.enum(["yes", "no"], { message: "Choose one" }),
  currentCarrier: z.string().max(80).optional().or(z.literal("")),
  coverageLevel: z.enum(["state_minimum", "standard", "premium"], { message: "Choose one" }),

  // Step: contact
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .refine((v) => /^[2-9]\d{2}[2-9]\d{6}$/.test(digitsOnly(v).replace(/^1(?=\d{10}$)/, "")), "Enter a valid US phone number"),
  address: z.string().trim().min(3, "Enter your street address").max(120),
  city: z.string().trim().min(2, "Enter your city").max(60),
  consent: z.literal(true, { errorMap: () => ({ message: "Please check the box to continue" }) }),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const trackingSchema = z
  .object({
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
    utmTerm: z.string().max(200).optional(),
    utmContent: z.string().max(200).optional(),
    gclid: z.string().max(300).optional(),
    fbclid: z.string().max(300).optional(),
    landingPage: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
  })
  .partial();

export const leadSubmissionSchema = z.object({
  form: quoteFormSchema,
  tracking: trackingSchema.optional().default({}),
  trustedFormCertUrl: z.string().url().max(300).optional().or(z.literal("")),
  pageUrl: z.string().max(500),
  consentVersion: z.string().max(60),
  website: z.string().max(200).optional(), // honeypot, must stay empty
});

// Vehicle service contract quote request: the car, its mileage and how to reach the person.
// No driving or insurance questions: a service contract isn't priced on the driver.
export const VSC_MILEAGE = ["25000", "50000", "75000", "100000", "125000", "150000", "200000"] as const;
export const vscFormSchema = z.object({
  zip: quoteFormSchema.shape.zip,
  state: quoteFormSchema.shape.state,
  vehicleYear: quoteFormSchema.shape.vehicleYear,
  vehicleMake: quoteFormSchema.shape.vehicleMake,
  vehicleModel: quoteFormSchema.shape.vehicleModel,
  mileage: z.enum(VSC_MILEAGE, { message: "Choose the mileage" }),
  firstName: quoteFormSchema.shape.firstName,
  lastName: quoteFormSchema.shape.lastName,
  email: quoteFormSchema.shape.email,
  phone: quoteFormSchema.shape.phone,
  consent: quoteFormSchema.shape.consent,
});

export type VscFormValues = z.infer<typeof vscFormSchema>;

export const vscSubmissionSchema = leadSubmissionSchema.extend({ form: vscFormSchema });

// Which fields belong to which step (used to validate one step at a time).
export const STEP_FIELDS = {
  location: ["zip", "state"],
  vehicle: ["vehicleYear", "vehicleMake", "vehicleModel", "ownership", "primaryUse", "annualMiles"],
  driver: ["firstName", "lastName", "dateOfBirth", "gender", "maritalStatus"],
  history: ["licenseStatus", "accidents", "violations"],
  insurance: ["currentlyInsured", "currentCarrier", "coverageLevel"],
  contact: ["email", "phone", "address", "city", "consent"],
} as const satisfies Record<string, readonly (keyof QuoteFormValues)[]>;

export type StepKey = keyof typeof STEP_FIELDS;
