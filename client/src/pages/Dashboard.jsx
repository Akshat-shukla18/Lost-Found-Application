import { useEffect, useState } from 'react'
import { api, authHeader } from '../services/api'

export default function Dashboard() {
  const [items, setItems] = useState([])

  useEffect(()=>{
    async function load() {
      try {
        const { data } = await api.get('/api/assessments', { headers: authHeader() })
        setItems(data.assessments)
      } catch {}
    }
    load()
  },[])

  return (
    <div>
      <h2>Your Assessments</h2>
      <div className="cards">
        {items.map(it => (
          <div key={it._id} className="card">
            <div className="card-title">{it.name}</div>
            <div>Location: {it.location}</div>
            <div>Potential: {it.potential} L/year</div>
            <div>Structure: {it.recommendedStructure}</div>
            <div>Cost: ₹{it.costEstimate}</div>
            <div className="muted">{new Date(it.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}