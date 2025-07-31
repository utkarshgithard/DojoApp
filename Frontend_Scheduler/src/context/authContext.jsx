import { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const AuthProvider= (props)=>{
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (newToken) => {
    console.log("helloworld")
    console.log(newToken)
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!token;
   const value = {token,login,logout,isAuthenticated}
  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}

export default AuthProvider