export function validateEmail(email: string) {
    if (typeof email !== 'string') return false;
    // A commonly used and practical regex for email validation.
    const regex = /^(?!.*\.\.)(?!.*["'“”‘’])(?!.*@.*@)[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*@[a-zA-Z][^\s@."']*(\.[^\s@"']+)+$/;
    return regex.test(String(email).toLowerCase());
};

export function validatePassword(password: string | null | undefined) {
    const p = String(password || '');

    const rules = {
        hasMinLength: p.length >= 8,
        hasUppercase: /[A-Z]/.test(p),
        hasLowercase: /[a-z]/.test(p),
        hasNumber: /\d/.test(p),
        hasSpecialChar: /[@$!%*?&]/.test(p),
    };

    return {
        ...rules,
        // Relaxed validation: Only requires Length, Lowercase, and a Number
        isFullyValid: rules.hasMinLength && rules.hasLowercase && rules.hasNumber,
    };
};

export function validateRecord(userName: string, userContact: string, date: string) {
    const nameRegex = /^(?:[A-Z][a-z]+(?: [A-Z][a-z]+)*) (?:[A-Z]\.?\s)?[A-Z][a-z]+(?: [A-Z][a-z]+)*$/;
    const validUserName = nameRegex.test(userName.trim());

    const isPhoneNumber = /^09\d{9}$/.test(userContact);

    const isValidEmail = validateEmail(userContact);

    const isValidDate = (() => {
        const inputDateStr = date;
        const todayStr = new Date().toISOString().split("T")[0];
        return inputDateStr > todayStr;
    })();

    const validations = {
        validUserName,
        validUserContact: isPhoneNumber || isValidEmail,
        validDate: isValidDate,
    };
    return {
        ...validations,
        isFullyValid: Object.values(validations).every(Boolean),
    };
}
