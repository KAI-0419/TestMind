import { supabase } from '../supabaseClient'

export default function Login() {
    console.log("Login 페이지가 로드되었습니다.");
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
    if (error) alert('로그인 실패: ' + error.message)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="text-2xl font-bold mb-4">Mindtap 로그인</h1>
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Google 계정으로 로그인
      </button>
    </div>
  )
}