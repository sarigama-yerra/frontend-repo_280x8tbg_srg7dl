import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const login = async (email, password) => {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await r.json()
    if (data.token) { localStorage.setItem('token', data.token); setToken(data.token) }
    else throw new Error(data.detail || 'Login failed')
  }
  const register = async (email, password, full_name) => {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, full_name }) })
    const data = await r.json()
    if (data.token) { localStorage.setItem('token', data.token); setToken(data.token) }
    else throw new Error(data.detail || 'Register failed')
  }
  const logout = () => { localStorage.removeItem('token'); setToken('') }
  return { token, login, register, logout }
}

function Prices() {
  const [prices, setPrices] = useState({})
  useEffect(() => {
    const load = async () => {
      const r = await fetch(`${API}/prices`)
      const d = await r.json()
      setPrices(d)
    }
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(prices).map(([p, v]) => (
        <div key={p} className="p-3 rounded bg-gray-900/40 border border-gray-800">{p}: <b>{v ? Number(v).toFixed(2) : '—'}</b></div>
      ))}
    </div>
  )
}

function Dashboard({ token }) {
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [dep, setDep] = useState({ asset: 'USDT', amount: 100 })
  const [order, setOrder] = useState({ side: 'buy', pair: 'BTC-USDT', amount: 0.001 })
  const load = async () => {
    const r = await fetch(`${API}/me?token=${token}`)
    const d = await r.json()
    setMe(d)
  }
  useEffect(() => { if (token) load() }, [token])

  const submitKyc = async () => {
    await fetch(`${API}/kyc/submit?token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_type: 'id', document_number: '123' }) })
    await load()
  }
  const deposit = async () => {
    await fetch(`${API}/deposit?token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dep) })
    await load()
  }
  const trade = async () => {
    const r = await fetch(`${API}/trade/order?token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) })
    const d = await r.json()
    if (d.detail) setError(d.detail); else setError(''); await load()
  }

  if (!me) return <div>Loading...</div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Welcome</h2>
          <p className="text-sm text-gray-400">KYC: {me.user?.kyc_status}</p>
        </div>
        <button onClick={submitKyc} className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Submit KYC</button>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Wallets</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {me.wallets?.map(w => (
            <div key={w._id} className="p-3 rounded bg-gray-900/40 border border-gray-800">
              <div className="text-sm text-gray-400">{w.asset}</div>
              <div className="text-lg font-semibold">{Number(w.balance).toFixed(6)}</div>
              <div className="text-xs break-all text-gray-500">{w.address}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="p-4 rounded border border-gray-800 bg-gray-900/30">
          <h3 className="font-semibold mb-2">Deposit</h3>
          <div className="flex gap-2 items-center">
            <select value={dep.asset} onChange={e => setDep({ ...dep, asset: e.target.value })} className="px-2 py-2 bg-gray-800 rounded">
              {['BTC', 'ETH', 'USDT'].map(a => <option key={a}>{a}</option>)}
            </select>
            <input type="number" value={dep.amount} onChange={e => setDep({ ...dep, amount: Number(e.target.value) })} className="px-2 py-2 bg-gray-800 rounded w-32" />
            <button onClick={deposit} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Credit</button>
          </div>
        </div>

        <div className="p-4 rounded border border-gray-800 bg-gray-900/30">
          <h3 className="font-semibold mb-2">Market Order</h3>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={order.side} onChange={e => setOrder({ ...order, side: e.target.value })} className="px-2 py-2 bg-gray-800 rounded">
              {['buy', 'sell'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={order.pair} onChange={e => setOrder({ ...order, pair: e.target.value })} className="px-2 py-2 bg-gray-800 rounded">
              {['BTC-USDT','ETH-USDT'].map(p => <option key={p}>{p}</option>)}
            </select>
            <input type="number" value={order.amount} onChange={e => setOrder({ ...order, amount: Number(e.target.value) })} className="px-2 py-2 bg-gray-800 rounded w-32" />
            <button onClick={trade} className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500">Execute</button>
          </div>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Live Prices</h3>
        <Prices />
      </div>
    </div>
  )
}

export default function App() {
  const { token, login, register, logout } = useAuth()
  const [view, setView] = useState('auth')
  const [auth, setAuth] = useState({ email: 'demo@lavo.exchange', password: 'password', name: 'Demo User' })

  useEffect(() => { if (token) setView('app') }, [token])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lavo Exchange</h1>
          <div className="flex gap-3">
            <a className="text-sm text-gray-400" href="https://binance.com" target="_blank">Inspired by Binance</a>
            {token && <button onClick={logout} className="px-3 py-2 rounded bg-gray-800">Logout</button>}
          </div>
        </header>

        {view === 'auth' && !token && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 rounded border border-gray-800 bg-gray-900/30">
              <h2 className="font-semibold mb-3">Create account</h2>
              <input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} className="w-full mb-2 px-3 py-2 bg-gray-800 rounded" />
              <input placeholder="Password" type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} className="w-full mb-2 px-3 py-2 bg-gray-800 rounded" />
              <input placeholder="Full name" value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} className="w-full mb-3 px-3 py-2 bg-gray-800 rounded" />
              <button onClick={()=>register(auth.email, auth.password, auth.name)} className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Register</button>
            </div>
            <div className="p-6 rounded border border-gray-800 bg-gray-900/30">
              <h2 className="font-semibold mb-3">Sign in</h2>
              <input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} className="w-full mb-2 px-3 py-2 bg-gray-800 rounded" />
              <input placeholder="Password" type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} className="w-full mb-3 px-3 py-2 bg-gray-800 rounded" />
              <button onClick={()=>login(auth.email, auth.password)} className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Login</button>
            </div>
          </div>
        )}

        {token && <Dashboard token={token} />}
      </div>
    </div>
  )
}
