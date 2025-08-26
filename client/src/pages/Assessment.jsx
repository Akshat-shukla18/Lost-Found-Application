import { useEffect, useState } from 'react'
import MapPicker from '../components/MapPicker'
import { api, authHeader } from '../services/api'

export default function Assessment() {
  const [form, setForm] = useState({
    name: '',
    location: '',
    coordinates: null,
    roofArea: '',
    dwellers: '',
    openSpace: '',
    roofMaterial: 'concrete',
    rainfall: ''
  })
  const [message, setMessage] = useState('')

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if (!token) return
  },[])

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setMessage('')
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('Please login to submit')
      return
    }
    try {
      const payload = {
        ...form,
        roofArea: Number(form.roofArea),
        dwellers: Number(form.dwellers),
        openSpace: Number(form.openSpace),
        rainfall: Number(form.rainfall)
      }
      const { data } = await api.post('/api/assess', payload, { headers: authHeader() })
      setMessage(`Saved. Potential: ${data.assessment.potential} L/year`)
    } catch (err) {
      setMessage('Assessment failed')
    }
  }

  return (
    <div>
      <h2>RTRWH Assessment</h2>
      <form onSubmit={onSubmit} className="form-grid">
        <input placeholder="Site name" value={form.name} onChange={(e)=>setField('name', e.target.value)} />
        <input placeholder="Location (city)" value={form.location} onChange={(e)=>setField('location', e.target.value)} />
        <input placeholder="Roof Area (m²)" value={form.roofArea} onChange={(e)=>setField('roofArea', e.target.value)} />
        <input placeholder="Number of dwellers" value={form.dwellers} onChange={(e)=>setField('dwellers', e.target.value)} />
        <input placeholder="Open Space (m²)" value={form.openSpace} onChange={(e)=>setField('openSpace', e.target.value)} />
        <select value={form.roofMaterial} onChange={(e)=>setField('roofMaterial', e.target.value)}>
          <option value="concrete">Concrete</option>
          <option value="metal">Metal</option>
          <option value="tile">Tile</option>
          <option value="thatch">Thatch</option>
          <option value="other">Other</option>
        </select>
        <input placeholder="Annual Rainfall (mm) optional" value={form.rainfall} onChange={(e)=>setField('rainfall', e.target.value)} />
        <div className="map-field">
          <label>Tap on map to set coordinates</label>
          <MapPicker value={form.coordinates} onChange={(val)=>setField('coordinates', val)} />
        </div>
        <button type="submit">Compute & Save</button>
      </form>
      {message && <div className="info">{message}</div>}
    </div>
  )
}