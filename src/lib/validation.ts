// Input validation and sanitization utilities

// Sanitize string input - remove potentially dangerous characters
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .slice(0, 10000); // Limit length
}

// Sanitize for display (more strict)
export function sanitizeForDisplay(input: string | undefined | null): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#x27;",
      };
      return entities[char] || char;
    })
    .slice(0, 10000);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validate password strength
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate and sanitize numeric input
export function validateNumber(
  input: any,
  options: { min?: number; max?: number; default?: number } = {}
): number | null {
  const { min = -Infinity, max = Infinity, default: defaultValue } = options;

  const num = typeof input === "number" ? input : parseFloat(input);

  if (isNaN(num)) {
    return defaultValue ?? null;
  }

  return Math.min(Math.max(num, min), max);
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate and sanitize array of strings
export function validateStringArray(
  input: any,
  options: { maxLength?: number; maxItems?: number } = {}
): string[] {
  const { maxLength = 100, maxItems = 50 } = options;

  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeString(item).slice(0, maxLength))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

// Validate profile data
export function validateProfileData(data: any): {
  valid: boolean;
  sanitized: Record<string, any>;
  errors: string[];
} {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  // Full name
  if (data.full_name !== undefined) {
    const name = sanitizeString(data.full_name);
    if (name.length < 1 || name.length > 100) {
      errors.push("Name must be between 1 and 100 characters");
    } else {
      sanitized.full_name = name;
    }
  }

  // Age
  if (data.age !== undefined) {
    const age = validateNumber(data.age, { min: 13, max: 120 });
    if (age === null) {
      errors.push("Age must be between 13 and 120");
    } else {
      sanitized.age = age;
    }
  }

  // Gender
  if (data.gender !== undefined) {
    const validGenders = ["male", "female", "other", "prefer-not-to-say"];
    const gender = sanitizeString(data.gender).toLowerCase();
    if (!validGenders.includes(gender)) {
      errors.push("Invalid gender value");
    } else {
      sanitized.gender = gender;
    }
  }

  // Height
  if (data.height_cm !== undefined) {
    const height = validateNumber(data.height_cm, { min: 50, max: 300 });
    if (height === null) {
      errors.push("Height must be between 50 and 300 cm");
    } else {
      sanitized.height_cm = height;
    }
  }

  // Weight
  if (data.weight_kg !== undefined) {
    const weight = validateNumber(data.weight_kg, { min: 20, max: 500 });
    if (weight === null) {
      errors.push("Weight must be between 20 and 500 kg");
    } else {
      sanitized.weight_kg = weight;
    }
  }

  // Fitness level
  if (data.fitness_level !== undefined) {
    const validLevels = ["beginner", "intermediate", "advanced"];
    const level = sanitizeString(data.fitness_level).toLowerCase();
    if (!validLevels.includes(level)) {
      errors.push("Invalid fitness level");
    } else {
      sanitized.fitness_level = level;
    }
  }

  // Activity level
  if (data.activity_level !== undefined) {
    const validLevels = [
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active",
    ];
    const level = sanitizeString(data.activity_level).toLowerCase();
    if (!validLevels.includes(level)) {
      errors.push("Invalid activity level");
    } else {
      sanitized.activity_level = level;
    }
  }

  // Fitness goal
  if (data.fitness_goal !== undefined) {
    sanitized.fitness_goal = sanitizeString(data.fitness_goal).slice(0, 100);
  }

  // Available days
  if (data.available_days !== undefined) {
    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const days = validateStringArray(data.available_days, { maxItems: 7 })
      .map((d) => d.toLowerCase())
      .filter((d) => validDays.includes(d));
    sanitized.available_days = days;
  }

  // Equipment access
  if (data.equipment_access !== undefined) {
    if (typeof data.equipment_access === "string") {
      sanitized.equipment_access = {
        description: sanitizeString(data.equipment_access).slice(0, 500),
      };
    } else if (typeof data.equipment_access === "object") {
      sanitized.equipment_access = {
        description: sanitizeString(data.equipment_access?.description).slice(
          0,
          500
        ),
      };
    }
  }

  // Injuries
  if (data.injuries !== undefined) {
    sanitized.injuries = validateStringArray(data.injuries, {
      maxLength: 100,
      maxItems: 20,
    });
  }

  // Dietary restrictions
  if (data.dietary_restrictions !== undefined) {
    sanitized.dietary_restrictions = validateStringArray(
      data.dietary_restrictions,
      { maxLength: 50, maxItems: 20 }
    );
  }

  // Food allergies
  if (data.food_allergies !== undefined) {
    sanitized.food_allergies = validateStringArray(data.food_allergies, {
      maxLength: 50,
      maxItems: 20,
    });
  }

  // Disliked foods
  if (data.disliked_foods !== undefined) {
    sanitized.disliked_foods = validateStringArray(data.disliked_foods, {
      maxLength: 50,
      maxItems: 50,
    });
  }

  // Meals per day
  if (data.meals_per_day !== undefined) {
    const meals = validateNumber(data.meals_per_day, {
      min: 1,
      max: 10,
      default: 3,
    });
    sanitized.meals_per_day = meals;
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

// Validate chat message
export function validateChatMessage(message: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!message || typeof message !== "string") {
    return { valid: false, sanitized: "", error: "Message is required" };
  }

  const sanitized = sanitizeString(message);

  if (sanitized.length === 0) {
    return { valid: false, sanitized: "", error: "Message cannot be empty" };
  }

  if (sanitized.length > 5000) {
    return {
      valid: false,
      sanitized: "",
      error: "Message is too long (max 5000 characters)",
    };
  }

  return { valid: true, sanitized };
}

// Validate workout log data
export function validateWorkoutLog(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.userId || !isValidUUID(data.userId)) {
    errors.push("Invalid user ID");
  }

  if (!data.planId || !isValidUUID(data.planId)) {
    errors.push("Invalid plan ID");
  }

  if (
    typeof data.dayIndex !== "number" ||
    data.dayIndex < 0 ||
    data.dayIndex > 10
  ) {
    errors.push("Invalid day index");
  }

  if (
    typeof data.duration_seconds !== "number" ||
    data.duration_seconds < 0 ||
    data.duration_seconds > 36000
  ) {
    errors.push("Invalid duration");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
