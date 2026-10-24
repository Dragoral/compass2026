import { useState, type FormEvent } from 'react'
import { api } from '../../../api/client'
import { useAction, useApi } from '../../../api/useApi'
import { ErrorMessage } from '../../../components/ErrorMessage'
import { Loader } from '../../../components/Loader'
import { formatDateTime } from '../../../format'

interface VisitRecord {
  id: number
  kind: 'in_person' | 'telemedicine' | 'async' | string
  at: string
  doctor_id: number
  reason: string | null
  notes: string | null
  plan: Record<string, unknown>
  next_visit_at: string | null
}
const KIND_LABEL: Record<string, string> = { in_person: 'Очный приём', telemedicine: 'Телемедицинская консультация', async: 'Отложенная консультация' }

export function VisitsHistory({ patientId, onCreated }: { patientId: string; onCreated: () => void }) {
  const state = useApi<VisitRecord[]>(`/api/doctor/patients/${patientId}/visits`)
  const [kind, setKind] = useState<VisitRecord['kind']>('in_person')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [diagnosisConfirmed, setDiagnosisConfirmed] = useState(true)
  const create = useAction((body: Record<string, unknown>) => api.post<VisitRecord>(`/api/doctor/patients/${patientId}/visits`, body))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      kind, reason: reason.trim() || null, notes: notes.trim() || null,
      plan: {}, next_visit_at: nextVisit ? new Date(nextVisit).toISOString() : null,
      diagnosis_confirmed: kind === 'in_person' && diagnosisConfirmed,
    }
    if (await create.run(payload)) {
      setReason(''); setNotes(''); setNextVisit(''); state.reload(); onCreated()
    }
  }

  return <section className="feature-card" aria-labelledby="visits-heading">
    <div className="feature-card-heading"><div><h2 id="visits-heading">История визитов</h2><p className="muted small">Записи приёмов, консультаций и запланированных следующих визитов.</p></div><button type="button" className="secondary" onClick={state.reload}>Обновить</button></div>
    <form className="form wide visit-form" onSubmit={submit}>
      <h3>Добавить визит</h3>
      <div className="two-col">
        <label>Тип визита<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="in_person">Очный приём</option><option value="telemedicine">Телемедицинская консультация</option><option value="async">Отложенная консультация</option></select></label>
        <label>Следующий визит<input type="datetime-local" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} /></label>
      </div>
      <label>Причина обращения<input maxLength={256} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина визита (необязательно)" /></label>
      <label>Заметки врача<textarea rows={3} maxLength={20000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Запишите факты визита, наблюдения и согласованный план" /></label>
      {kind === 'in_person' && <label className="checkbox"><input type="checkbox" checked={diagnosisConfirmed} onChange={(e) => setDiagnosisConfirmed(e.target.checked)} /> Диагноз подтверждён на очном приёме</label>}
      <ErrorMessage error={create.error} />
      <button type="submit" disabled={create.pending}>{create.pending ? 'Сохраняем…' : 'Сохранить запись о визите'}</button>
    </form>
    <Loader state={state}>{(visits) => visits.length === 0 ? <div className="empty-state"><strong>Истории визитов пока нет</strong><p>Добавленная запись появится здесь.</p></div> : <div className="visit-list">{visits.map((v) => <article className="visit-item" key={v.id}>
      <div className="feature-card-heading"><h3>{KIND_LABEL[v.kind] ?? v.kind}</h3><span className="muted small">{formatDateTime(v.at)}</span></div>
      {v.reason && <p><strong>Причина:</strong> {v.reason}</p>}
      {v.notes && <p className="plain-text">{v.notes}</p>}
      {v.next_visit_at && <p><strong>Следующий визит:</strong> {formatDateTime(v.next_visit_at)}</p>}
      {Object.keys(v.plan ?? {}).length > 0 && <details><summary>Структурированный план</summary><pre className="plain-text">{JSON.stringify(v.plan, null, 2)}</pre></details>}
    </article>)}</div>}</Loader>
  </section>
}
