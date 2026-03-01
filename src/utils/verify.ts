export function isValidUsername(username: string): boolean {
    if (!username) return false;

    // Only letters, numbers, underscore
    const regex = /^[a-zA-Z0-9_]{3,72}$/;

    return regex.test(username);
}

export function isValidPassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*\d).{8,}$/;
    return regex.test(password);
}
