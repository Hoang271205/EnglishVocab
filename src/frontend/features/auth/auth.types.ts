export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'learner';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export interface AuthUserResponse {
  user: AuthUser;
}

export type LoginAction = (credentials: LoginCredentials) => Promise<boolean>;

export interface LoginViewProps {
  busy: boolean;
  error: string | null;
  onLogin: LoginAction;
}
