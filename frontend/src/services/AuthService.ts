/**
 * AuthService — Firebase Authentication singleton.
 *
 * Provides Google Sign-In, Sign-Out, and current user access
 * following the singleton service pattern.
 */
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';

class AuthService {
  private static instance: AuthService;
  private provider: GoogleAuthProvider;

  private constructor() {
    this.provider = new GoogleAuthProvider();
    this.provider.addScope('https://www.googleapis.com/auth/calendar');
  }

  /** Get singleton instance */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Sign in with Google OAuth2 popup */
  async signInWithGoogle(): Promise<UserCredential> {
    return signInWithPopup(auth, this.provider);
  }

  /** Sign out current user */
  async signOut(): Promise<void> {
    return firebaseSignOut(auth);
  }

  /** Get currently signed-in user (null if not signed in) */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /** Get the Firebase ID token for API authentication */
  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  /** Subscribe to auth state changes */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}

export default AuthService.getInstance();
