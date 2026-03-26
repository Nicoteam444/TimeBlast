import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const STEPS = [
  {
    title: 'Bienvenue sur TimeBlast.ai ! 🚀',
    description: 'Votre plateforme IA pour centraliser et activer les données de votre entreprise. Suivez ce guide rapide pour découvrir les fonctionnalités clés.',
    icon: '👋',
    target: null, // No highlight, just centered modal
    position: 'center'},
  {
    title: 'Votre Dashboard',
    description: 'Votre tableau de bord personnalisé avec vos tâches, votre temps, les alertes, et les objectifs d\'équipe. Vous pouvez réorganiser les widgets par drag & drop.',
    icon: '📊',
    target: null,
    route: '/',
    position: 'center'},
  {
    title: 'Le Calendrier',
    description: 'Consultez et gérez les agendas de votre équipe. Saisissez votre temps directement en cliquant sur un créneau. Sélectionnez les collaborateurs à afficher sur la gauche.',
    icon: '📆',
    target: null,
    route: '/calendrier',
    position: 'center'},
  {
    title: 'Gestion de Projet',
    description: 'Organisez vos projets en mode Kanban. Créez des tâches, assignez-les, suivez l\'avancement. Chaque colonne a un compteur et un total d\'heures.',
    icon: '📁',
    target: null,
    route: '/activite/projets',
    position: 'center'},
  {
    title: 'CRM — Contacts & Leads',
    description: 'Centralisez tous vos contacts, entreprises et opportunités commerciales. Suivez votre pipeline en vue Kanban ou en liste.',
    icon: '🎯',
    target: null,
    route: '/crm',
    position: 'center'},
  {
    title: 'Votre Équipe',
    description: 'Retrouvez vos collaborateurs, gérez les absences, les notes de frais, les compétences. Le trombinoscope et l\'organigramme sont accessibles ici.',
    icon: '👥',
    target: null,
    route: '/equipe',
    position: 'center'},
  {
    title: 'Documents & Archives',
    description: 'Importez, classez et retrouvez vos documents. L\'OCR extrait automatiquement les informations clés. Cliquez sur un document pour le prévisualiser.',
    icon: '📄',
    target: null,
    route: '/documents',
    position: 'center'},
  {
    title: 'La Recherche Universelle',
    description: 'Appuyez sur ⌘K (ou Ctrl+K) depuis n\'importe où pour rechercher un client, un projet, un contact... Tout est à portée de clavier.',
    icon: '🔍',
    target: null,
    position: 'center'},
  {
    title: 'L\'Assistant IA',
    description: 'En bas à droite, votre assistant IA 👾 répond à vos questions sur vos données : "Combien ai-je facturé ce mois ?", "Quels projets sont en retard ?"',
    icon: '👾',
    target: null,
    position: 'center'},
  {
    title: 'Vous êtes prêt ! 🎉',
    description: 'Explorez TimeBlast à votre rythme. N\'hésitez pas à personnaliser votre espace dans les Paramètres. Bonne découverte !',
    icon: '🏆',
    target: null,
    position: 'center'},
]

export default function OnboardingTour() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!profile) return
    // Check if user has completed onboarding
    const done = localStorage.getItem(`tb_onboarding_done_${user?.id}`)
    if (!done) {
      setVisible(true)
    }
  }, [profile, user?.id])

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      finish()
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function finish() {
    setExiting(true)
    localStorage.setItem(`tb_onboarding_done_${user?.id}`, 'true')
    // Also save in DB for cross-device
    if (user?.id) {
      supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id).then(() => {})
    }
    setTimeout(() => {
      setVisible(false)
      navigate('/')
    }, 400)
  }

  function skip() {
    finish()
  }

  if (!visible) return null

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <>
      <style>{`
        @keyframes onboardFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes onboardSlideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes onboardFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 99998,
        animation: exiting ? 'onboardFadeOut .4s ease forwards' : 'onboardFadeIn .3s ease'}} onClick={skip} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        width: 'min(520px, 90vw)',
        overflow: 'hidden',
        animation: exiting ? 'onboardFadeOut .4s ease forwards' : 'onboardSlideUp .4s ease'}}>
        {/* Progress bar */}
        <div style={{ height: 4, background: '#e2e8f0' }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg, #2B4C7E, #1a8cff)',
            width: `${progress}%`, transition: 'width .4s ease',
            borderRadius: '0 2px 2px 0'}} />
        </div>

        {/* Header with gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #2B4C7E 0%, #1a3a5c 100%)',
          padding: '2rem 2rem 1.5rem',
          textAlign: 'center'}}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{step.icon}</div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>
            {step.title}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.8rem', marginTop: 8 }}>
            Étape {currentStep + 1} sur {STEPS.length}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 2rem' }}>
          <p style={{
            margin: 0, color: '#475569', fontSize: '.95rem', lineHeight: 1.7,
            textAlign: 'center'}}>
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 2rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <button onClick={skip} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: '.85rem', padding: '6px 12px'}}>
            Passer le tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={prevStep} style={{
                padding: '8px 20px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#475569', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600}}>
                ← Précédent
              </button>
            )}
            <button onClick={nextStep} style={{
              padding: '8px 24px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #2B4C7E, #1a8cff)',
              color: '#fff', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(43,76,126,0.3)'}}>
              {isLast ? '🚀 C\'est parti !' : 'Suivant →'}
            </button>
          </div>
        </div>

        {/* Dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6,
          paddingBottom: '1rem'}}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === currentStep ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i === currentStep ? '#2B4C7E' : i < currentStep ? '#93c5fd' : '#e2e8f0',
              transition: 'all .3s ease'}} />
          ))}
        </div>
      </div>
    </>
  )
}
