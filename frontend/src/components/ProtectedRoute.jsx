import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  // localStorage에서 토큰 확인
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');

  // 토큰과 사용자 정보가 있으면 자식 컴포넌트 렌더링
  if (token && user) {
    return children;
  }

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  return <Navigate to="/login" replace />;
}

export default ProtectedRoute;
