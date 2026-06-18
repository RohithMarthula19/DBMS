import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import client from '../api/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#059669'];
const CATEGORIES = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Income', 'Loan', 'Utilities', 'Health', 'Other'];

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [spending, setSpending] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'Food', limit: '' });
  
  const cust = JSON.parse(localStorage.getItem('customer') || '{}');

  const fetchBudgets = (aid) => {
    client.get(`/analytics/budgets/${aid}`).then(r => setBudgets(r.data));
  };

  useEffect(() => {
    client.get('/accounts').then(r => {
      setAccounts(r.data);
      if (r.data.length) {
        const aid = r.data[0].account_id;
        client.get(`/analytics/spending/${aid}`).then(r => setSpending(r.data));
        fetchBudgets(aid);
        client.get(`/analytics/summary/${aid}`).then(r => setSummary(r.data));
      }
    });
    client.get('/accounts/notifications').then(r => setNotifs(r.data));
  }, []);

  const handleSaveBudget = () => {
    if (!newBudget.limit || isNaN(newBudget.limit)) return alert('Please enter a valid limit');
    const aid = accounts[0]?.account_id;
    if (!aid) return;

    client.post('/accounts/budget', {
      account_id: aid,
      category: newBudget.category,
      monthly_limit: parseFloat(newBudget.limit)
    }).then(() => {
      fetchBudgets(aid);
      setShowBudgetForm(false);
      setNewBudget({ category: 'Food', limit: '' });
    }).catch(err => alert(err.response?.data?.error || 'Failed to save budget'));
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ fontFamily:'sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>
        <h2 style={{ color:'#000000' }}>Welcome back, {cust.name} 👋</h2>

        {/* Accounts */}
        <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' }}>
          {accounts.map(a => (
            <div key={a.account_id} style={card}>
              <div style={{ fontSize:12, color:'#000000', textTransform:'uppercase', letterSpacing:1 }}>{a.account_type}</div>
              <div style={{ fontSize:28, fontWeight:'bold', color:'#000000', margin:'8px 0' }}>
                ₹{parseFloat(a.balance).toLocaleString('en-IN', { minimumFractionDigits:2 })}
              </div>
              {a.account_type === 'VAULT' && a.vault_unlock_date && (
                <div style={{ fontSize:11, color:'#d97706' }}>🔒 Locked until {new Date(a.vault_unlock_date).toLocaleDateString()}</div>
              )}
              {a.account_type === 'VAULT' && a.vault_target_amount && (
                <div style={{ fontSize:11, color:'#7c3aed' }}>🎯 Goal: ₹{parseFloat(a.vault_target_amount).toLocaleString()}</div>
              )}
              <div style={{ fontSize:11, color:'#000000', marginTop:4 }}>{a.account_id}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:24 }}>
          {/* Spending Pie */}
          <div style={card}>
            <h3 style={{ margin:'0 0 12px', color:'#000000' }}>This Month's Spending</h3>
            {spending.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={spending} dataKey="total_spent" nameKey="category" cx="50%" cy="50%" outerRadius={70}>
                    {spending.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `₹${parseFloat(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color:'#000000' }}>No spending data yet</p>}
          </div>

          {/* Budgets */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0, color:'#000000' }}>Budget Status</h3>
              <button onClick={() => setShowBudgetForm(!showBudgetForm)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#2563eb' }}>
                {showBudgetForm ? '✕' : '+'}
              </button>
            </div>

            {showBudgetForm && (
              <div style={{ padding:12, background:'#f8fafc', borderRadius:8, marginBottom:16, border:'1px solid #e2e8f0' }}>
                <select 
                  value={newBudget.category} 
                  onChange={e => setNewBudget({...newBudget, category: e.target.value})}
                  style={{ width:'100%', padding:6, marginBottom:8, borderRadius:4, border:'1px solid #cbd5e1' }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="Monthly Limit (₹)" 
                  value={newBudget.limit}
                  onChange={e => setNewBudget({...newBudget, limit: e.target.value})}
                  style={{ width:'100%', padding:6, marginBottom:8, borderRadius:4, border:'1px solid #cbd5e1', boxSizing:'border-box' }}
                />
                <button onClick={handleSaveBudget} style={{ width:'100%', padding:8, background:'#000000', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold' }}>
                  Save Budget
                </button>
              </div>
            )}

            {budgets.map(b => (
              <div 
                key={b.category} 
                onClick={() => { setShowBudgetForm(true); setNewBudget({ category: b.category, limit: b.monthly_limit }); }}
                style={{ marginBottom:10, cursor:'pointer', padding:4, borderRadius:6, transition:'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span>{b.category}</span>
                  <span style={{ color: b.pct_used >= 100 ? '#dc2626' : '#000000' }}>
                    {b.pct_used}%
                  </span>
                </div>
                <div style={{ background:'#e5e7eb', borderRadius:4, height:7, marginTop:3 }}>
                  <div style={{
                    width:`${Math.min(b.pct_used, 100)}%`,
                    background: b.pct_used >= 100 ? '#dc2626' : b.pct_used >= 80 ? '#d97706' : '#16a34a',
                    height:'100%', borderRadius:4, transition:'width 0.3s'
                  }}/>
                </div>
              </div>
            ))}
            {!budgets.length && !showBudgetForm && <p style={{ color:'#000000', fontSize:13 }}>No budgets configured</p>}
          </div>

          {/* Monthly Summary */}
          <div style={card}>
            <h3 style={{ margin:'0 0 12px', color:'#000000' }}>Monthly Overview</h3>
            {summary.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.slice(0,6).reverse()}>
                  <XAxis dataKey="month" tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { month:'short' })} tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip formatter={v => `₹${parseFloat(v).toLocaleString()}`} />
                  <Bar dataKey="total_debits" fill="#dc2626" name="Spent" />
                  <Bar dataKey="total_credits" fill="#16a34a" name="Received" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color:'#000000' }}>No summary yet</p>}
          </div>
        </div>

        {/* Notifications */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3 style={{ margin:0, color:'#000000' }}>
              Notifications {unread > 0 && <span style={{ background:'#dc2626', color:'white', borderRadius:10, padding:'2px 8px', fontSize:12 }}>{unread}</span>}
            </h3>
            {unread > 0 && (
              <button onClick={() => client.put('/accounts/notifications/read').then(() => setNotifs(notifs.map(n => ({...n, is_read:true}))))}
                style={{ fontSize:12, padding:'4px 10px', background:'#eff6ff', border:'1px solid #2563eb', borderRadius:4, cursor:'pointer', color:'#000000', fontWeight:'bold' }}>
                Mark all read
              </button>
            )}
          </div>
          {notifs.slice(0,8).map(n => (
            <div key={n.notification_id} style={{
              padding:'8px 12px', marginBottom:6, borderRadius:6, fontSize:13,
              background: n.is_read ? '#f9fafb' : '#eff6ff',
              borderLeft: `3px solid ${n.is_read ? '#e5e7eb' : '#2563eb'}`
            }}>
              {n.message}
              <span style={{ float:'right', color:'#000000', fontSize:11 }}>
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {!notifs.length && <p style={{ color:'#000000' }}>No notifications</p>}
        </div>
      </div>
    </div>
  );
}

const card = { background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };