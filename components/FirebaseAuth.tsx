
import React, { useState, useEffect } from 'react';
import App from '../App';
import { auth, db } from '../firebaseConfig';
import * as firebase from 'firebase/compat/app'; // Use namespace import for consistency
import { FIREBASE_ENABLED } from '../config';
import ErrorBoundary from './ErrorBoundary';

type User = firebase.default.User;
type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'unauthorized';

// Helper component for the specific unauthorized domain error
const UnauthorizedDomainError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const [copied, setCopied] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);
  const projectId = "gerenciadorhorario-c62e9";
  const consoleUrl = `https://console.firebase.google.com/u/0/project/${projectId}/authentication/providers`;

  useEffect(() => {
    setDomain(window.location.hostname || 'domínio não detectado');
  }, []);

  useEffect(() => {
    if (copied) {
        const timerId = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timerId);
    }
  }, [copied]);

  const handleCopyToClipboard = () => {
    if (domain && domain !== 'domínio não detectado') {
        navigator.clipboard.writeText(domain).then(() => setCopied(true));
    }
  };

  return (
    <>
      <h3 className="text-xl font-bold text-red-700 mb-4 text-center">Configuração Necessária</h3>
      <p className="text-sm text-gray-700 mb-4">
        Para que o login com Google funcione, o domínio que você está usando para acessar esta aplicação precisa ser autorizado no seu projeto Firebase.
      </p>
      <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
        <p className="text-sm text-gray-600">Copie este domínio:</p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <code className="text-red-800 font-mono bg-red-100 px-2 py-1 rounded w-full break-all h-8 flex items-center">
            {domain === null ? 'Carregando...' : domain}
          </code>
          <button
            onClick={handleCopyToClipboard}
            disabled={!domain || domain === 'domínio não detectado'}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <h4 className="font-semibold mb-2 text-gray-800">Como Corrigir:</h4>
      <ol className="list-decimal list-inside text-sm space-y-2 mb-4 text-gray-700">
        <li>
          Abra o Console do Firebase (link abaixo).
        </li>
        <li>
          Navegue até a seção <strong className="font-semibold">Authentication</strong>.
        </li>
        <li>
          Clique na aba <strong className="font-semibold">Sign-in method</strong>.
        </li>
        <li>
          Role para baixo até a seção <strong className="font-semibold">Authorized domains</strong>.
        </li>
        <li>
          Clique em <strong className="font-semibold">Add domain</strong> e cole o domínio copiado.
        </li>
      </ol>
      <div className="space-y-3 mt-6">
        <a 
          href={consoleUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Abrir Firebase Console
        </a>
        <button
          onClick={onRetry}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Tentar Novamente
        </button>
      </div>
    </>
  );
};

// This new component contains all the hooks and logic for Firebase auth.
const FirebaseEnabledAuth: React.FC = () => {
    const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!auth) return;
        
        const provider = new firebase.default.auth.GoogleAuthProvider();
        setAuthStatus('loading');
        setError(null);
        try {
            await auth.signInWithPopup(provider);
        } catch (error: any) {
            console.error("Firebase login error:", error);
            let errorMessage = "Falha ao fazer login. Por favor, tente novamente.";
            if (error.code) {
                switch (error.code) {
                    case 'auth/popup-closed-by-user':
                    case 'auth/cancelled-popup-request':
                        setAuthStatus('unauthenticated');
                        return;
                    case 'auth/popup-blocked':
                        errorMessage = "O popup de login foi bloqueado pelo seu navegador. Por favor, habilite popups para este site e tente novamente.";
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = "O login com Google não está habilitado para este aplicativo. Por favor, contate o administrador.";
                        break;
                    case 'auth/unauthorized-domain':
                        setError('auth/unauthorized-domain');
                        setAuthStatus('unauthenticated');
                        return;
                }
            }
            setError(errorMessage);
            setAuthStatus('unauthenticated');
        }
    };
    
    useEffect(() => {
        if (!auth || !db) {
            setAuthStatus('unauthenticated');
            setError("Configuração do Firebase está incompleta.");
            return;
        }

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setAuthStatus('loading');
            
            if (currentUser && currentUser.email) {
                setUser(currentUser);
                const userDocRef = db.doc(`allowed_users/${currentUser.email}`);
                try {
                    const docSnap = await userDocRef.get();
                    if (docSnap.exists) {
                        setAuthStatus('authenticated');
                        setError(null);
                    } else {
                        setAuthStatus('unauthorized');
                    }
                } catch (e: any) {
                    console.error("Error checking Firestore permissions:", e);
                    if (e.code === 'permission-denied' || e.code === 'unauthenticated') {
                        setError("Erro de permissão ao verificar usuário. Tente novamente.");
                    } else {
                        setError("Erro ao verificar permissões. Tente novamente mais tarde.");
                    }
                    setAuthStatus('unauthenticated');
                    await auth.signOut();
                }
            } else {
                setUser(null);
                setAuthStatus('unauthenticated');
                if (error !== 'auth/unauthorized-domain') {
                    setError(null);
                }
            }
        });
        return () => unsubscribe();
    }, [error]);

    const handleLogout = async () => {
        if (!auth) return;
        await auth.signOut();
        setError(null);
    };

    if (authStatus === 'authenticated') {
        return <ErrorBoundary><App /></ErrorBoundary>;
    }
    
    const renderContent = () => {
         if (error === 'auth/unauthorized-domain') {
           return <UnauthorizedDomainError onRetry={handleLogin} />;
         }
    
         switch(authStatus) {
            case 'loading':
                return <p className="text-gray-600 text-center">Verificando...</p>;
            case 'unauthorized':
                return (
                    <>
                        <p className="text-center text-red-600 mb-4">
                            Acesso negado. O e-mail <strong>{user?.email}</strong> não tem permissão para acessar este sistema.
                        </p>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        >
                            Sair e tentar com outra conta
                        </button>
                    </>
                );
            case 'unauthenticated':
            default:
                return (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acesso ao Sistema</h2>
                        <p className="text-center text-gray-600 mb-6">Por favor, utilize sua conta Google para continuar.</p>
                        {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}
                        <button
                            onClick={handleLogin}
                            className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.13-10.12 7.13-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                            Entrar com Google
                        </button>
                    </>
                );
         }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                {renderContent()}
            </div>
        </div>
    );
}

// The main component is now a simple router. No hooks here.
const FirebaseAuth: React.FC = () => {
  if (FIREBASE_ENABLED) {
    return <FirebaseEnabledAuth />;
  }
  
  // Offline mode: render the app directly and unconditionally.
  return <ErrorBoundary><App /></ErrorBoundary>;
};

export default FirebaseAuth;
