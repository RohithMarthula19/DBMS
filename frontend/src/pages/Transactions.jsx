import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import client from '../api/client';

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ttAccount, setTtAccount] = useState('');
  const [ttTime, setTtTime] = useState('');
  const [ttBalance, setTtBalance] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    client.get('/transactions').then(r => setTxns(r.data));
    client.get('/accounts').then(r => { setAccounts(r.data); if(r.data.length) setTtAccount(r.data[0].account_id); });
  }, []);

  const requestReversal = async (txId) => {
    const reason = prompt('Reason for reversal request?');
    if (!reason) return;
    try {
      await client.post('/reversals/request', { transaction_id: txId, reason });
      alert('Reversal request submitted. Receiver has 48 hours to respond.');
    } catch (e) { alert(e.response?.data?.error); }
  };

  const checkTT = async () => {
    const { data } = await client.get(`/transactions/balance-at?account_id=${ttAccount}&timestamp=${ttTime}`);
    setTtBalance(data.balance);
  };

  const checkIntegrity = async () => {
    const { data } = await client.get('/transactions/integrity');
    setIntegrity(data);
  };

  return (
    <div style={{ fontFamily:'sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
        <h2 style={{ color:'#000000' }}>Transaction History</h2>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          {/* Time Travel */}
          <div style={card}>
            <h4 style={{ margin:'0 0 12px', color:'#000000' }}>⏰ Time-Travel Balance Query</h4>
            <select value={ttAccount} onChange={e => setTtAccount(e.target.value)} style={inp}>
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_type}</option>)}
            </select>
            <input type="datetime-local" value={ttTime} onChange={e => setTtTime(e.target.value)} style={inp} />
            <button onClick={checkTT} style={btn}>Query Historical Balance</button>
            {ttBalance !== null && (
              <div style={{ marginTop:10, padding:10, background:'#eff6ff', borderRadius:6, fontWeight:'bold' }}>
                Balance at that time: ₹{parseFloat(ttBalance).toFixed(2)}
              </div>
            )}
          </div>

          {/* Integrity Check */}
          <div style={card}>
            <h4 style={{ margin:'0 0 12px', color:'#000000' }}>✅ Double-Entry Integrity Check</h4>
            <p style={{ fontSize:13, color:'#000000' }}>
              Verifies that every transaction's debits equal its credits. Proves the ledger is uncorrupted.
            </p>
            <button onClick={checkIntegrity} style={btn}>Run Integrity Check</button>
            {integrity && (
              <div style={{
                marginTop:10, padding:10, borderRadius:6, fontWeight:'bold',
                background: integrity.result === 'PASS' ? '#dcfce7' : '#fee2e2',
                color: integrity.result === 'PASS' ? '#166534' : '#991b1b'
              }}>
                {integrity.result === 'PASS'
                  ? '✅ PASS — All double-entry records balance perfectly'
                  : `❌ FAIL — ${integrity.violations.length} violations found`}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        <div style={card}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f1f5f9' }}>
                {['Date','Txn ID','Counterparty','Type','Description','Amount','Running Balance','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#374151', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.entry_id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                  <td style={td}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={td}>
                    <div style={{ fontSize:10, fontFamily:'monospace', color:'#000000' }} title={t.transaction_id}>
                      {t.transaction_id.substring(0,8)}...
                    </div>
                  </td>
                  <td style={td}>
                    {t.counterparty_account ? (
                      <div style={{ fontSize:11, color:'#000000' }}>
                        {t.direction === 'DEBIT' ? 'To: ' : 'From: '}
                        <span style={{ fontFamily:'monospace' }} title={t.counterparty_account}>{t.counterparty_account.substring(0,8)}...</span>
                      </div>
                    ) : (
                      <span style={{ fontSize:11, color:'#000000' }}>External / NA</span>
                    )}
                  </td>
                  <td style={td}><span style={{ background:'#eff6ff', color:'#1d4ed8', padding:'2px 8px', borderRadius:10, fontSize:11 }}>{t.type}</span></td>
                  <td style={td}>{t.description || '—'}</td>
                  <td style={{ ...td, fontWeight:'bold', color: t.direction==='CREDIT' ? '#16a34a' : '#dc2626' }}>
                    {t.direction==='CREDIT' ? '+' : '-'}₹{parseFloat(t.amount).toFixed(2)}
                  </td>
                  <td style={td}>₹{parseFloat(t.running_balance || 0).toFixed(2)}</td>
                  <td style={td}>
                    {t.direction==='DEBIT' && t.status==='COMPLETED' && t.type !== 'REVERSAL' && (
                      <button onClick={() => requestReversal(t.transaction_id)}
                        style={{ padding:'6px 12px', fontSize:12, background:'#991b1b', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold', boxShadow:'0 2px 4px rgba(0,0,0,0.2)' }}>
                        ↩ Reverse Transaction
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!txns.length && <tr><td colSpan={8} style={{ padding:24, textAlign:'center', color:'#000000' }}>No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
const card = { background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
const inp = { display:'block', width:'100%', marginBottom:10, padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box', fontSize:13 };
const btn = { padding:'8px 16px', background:'#000000', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:'bold' };
const td = { padding:'10px 12px' };