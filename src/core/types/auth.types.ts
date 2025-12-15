export interface AuthCredentials {
    email: string;
    password: string;
    username?: string;
}

export type AuthMode = 'login' | 'register';