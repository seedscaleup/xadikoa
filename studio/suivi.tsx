import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import type {Tool} from 'sanity'
import config from './config.json'

type Ligne = {nom: string; exemples: number; reels: number; brouillons: number}
type Totaux = {videosExemples: number; auteursExemples: number}

const REQUETE = `{
  "rubriques": *[_type=="rubrique"]|order(ordre asc){
    nom,
    "exemples": count(*[_type=="article" && rubrique._ref==^._id && exemple==true && !(_id in path("drafts.**"))]),
    "reels": count(*[_type=="article" && rubrique._ref==^._id && exemple!=true && !(_id in path("drafts.**"))]),
    "brouillons": count(*[_type=="article" && rubrique._ref==^._id && _id in path("drafts.**")])
  },
  "videosExemples": count(*[_type=="video" && exemple==true && !(_id in path("drafts.**"))]),
  "auteursExemples": count(*[_type=="auteur" && exemple==true && !(_id in path("drafts.**"))])
}`

const cellule = {padding: '10px 14px', borderBottom: '1px solid #ddd', textAlign: 'left' as const}

function Suivi() {
  const client = useClient({apiVersion: config.apiVersion})
  const [data, setData] = useState<{rubriques: Ligne[]} & Totaux | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    const charger = () => client.fetch(REQUETE).then((d) => actif && setData(d)).catch((e) => actif && setErreur(String(e.message || e)))
    charger()
    const t = setInterval(charger, 15000)
    return () => {
      actif = false
      clearInterval(t)
    }
  }, [client])

  return (
    <div style={{padding: '28px 32px', maxWidth: 900, fontFamily: 'system-ui, sans-serif'}}>
      <h1 style={{margin: 0, fontSize: 26}}>Suivi du remplacement</h1>
      <p style={{color: '#555', marginTop: 8}}>
        Les articles marqués « 🧪 exemple » sont les contenus fictifs d’origine. Réécrivez-les (ou supprimez-les) rubrique par rubrique : la barre se remplit à mesure que de vrais articles sont publiés.
      </p>
      {erreur && <p style={{color: '#b00020'}}>Impossible de charger le suivi : {erreur}</p>}
      {!data && !erreur && <p>Chargement…</p>}
      {data && (
        <>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 16}}>
            <thead>
              <tr>
                <th style={cellule}>Rubrique</th>
                <th style={cellule}>Exemples à remplacer</th>
                <th style={cellule}>Articles réels publiés</th>
                <th style={cellule}>Brouillons en cours</th>
                <th style={{...cellule, width: 220}}>Avancement</th>
              </tr>
            </thead>
            <tbody>
              {data.rubriques.map((r) => {
                const total = r.exemples + r.reels
                const pct = total ? Math.round((r.reels / total) * 100) : 0
                return (
                  <tr key={r.nom}>
                    <td style={{...cellule, fontWeight: 600}}>{r.nom}</td>
                    <td style={cellule}>{r.exemples}</td>
                    <td style={cellule}>{r.reels}</td>
                    <td style={cellule}>{r.brouillons}</td>
                    <td style={cellule}>
                      <div style={{background: '#eee', borderRadius: 99, height: 12, overflow: 'hidden'}}>
                        <div style={{width: pct + '%', background: '#0066FC', height: '100%'}} />
                      </div>
                      <small>{pct} % remplacé</small>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{marginTop: 20}}>
            Vidéos d’exemple restantes : <b>{data.videosExemples}</b> · Fiches d’auteur d’exemple restantes : <b>{data.auteursExemples}</b>
          </p>
        </>
      )}
    </div>
  )
}

export const suiviTool: Tool = {name: 'suivi', title: 'Suivi du remplacement', component: Suivi}
