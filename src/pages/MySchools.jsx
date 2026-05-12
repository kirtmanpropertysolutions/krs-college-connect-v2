import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, pointerWithin, useDroppable } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreVertical } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolDetailModal from '../components/SchoolDetailModal.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { getSchoolColors, isLightColor } from '../lib/schoolColors'
import { calculateFitScore, getFitScoreBadge } from '../lib/fitScore.js'
import { logActivity } from '../lib/activity.js'

const STAGES = [
  { id: 'interested', name: 'INTERESTED', color: 'bg-text-muted', textColor: 'text-white' },
  { id: 'contacted', name: 'CONTACTED', color: 'bg-blue-600', textColor: 'text-white' },
  { id: 'visiting', name: 'VISITING', color: 'bg-eastside-gold', textColor: 'text-black' },
  { id: 'offer', name: 'OFFER', color: 'bg-orange-500', textColor: 'text-white' },
  { id: 'committed', name: 'COMMITTED', color: 'bg-green-600', textColor: 'text-white' }
]

function SchoolCard({ school, onEmailCoach, onViewSchool, onRemove, onChangeStage }) {
  const [showMenu, setShowMenu] = useState(false)
  const schoolName = school.schools?.name || school.school
  const schoolColors = getSchoolColors(schoolName)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: school.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  // Calculate fit score if available
  const fitScore = school.quiz_responses ? calculateFitScore(school, school.quiz_responses, school.profile) : null
  const fitBadge = fitScore ? getFitScoreBadge(fitScore, true) : null

  // Calculate last contact
  const getLastContact = () => {
    if (school.last_outreach_date) {
      const daysSince = Math.floor((new Date() - new Date(school.last_outreach_date)) / (1000 * 60 * 60 * 24))
      return daysSince === 0 ? 'Today' : `${daysSince}d ago`
    }
    return 'Never contacted'
  }

  // Use secondary color for light primaries
  const accentColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary
  const tintColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `3px solid ${accentColor}`,
        background: `linear-gradient(135deg, ${tintColor}10 0%, ${tintColor}05 50%, transparent 100%), #111827`
      }}
      {...attributes}
      {...listeners}
      className="rounded-lg p-3 mb-3 cursor-grab active:cursor-grabbing relative group hover:bg-card-hover transition-colors border border-card-border border-l-0"
    >
      {/* Fit score badge */}
      {fitScore && (
        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${fitBadge.className} z-10`}>
          {fitScore}
        </span>
      )}

      <div className="flex items-center gap-3 mb-2 pr-8">
        <SchoolBadge schoolName={school.schools?.name || school.school} size="md" />
        <h3 className="text-white font-medium text-[13px] truncate flex-1">
          {school.schools?.name || school.school}
        </h3>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {school.schools?.division && (
          <span className="px-2 py-1 rounded-lg text-[10px] font-medium text-white bg-text-muted">
            {school.schools.division}
          </span>
        )}
        {school.schools?.conference && (
          <span className="text-[10px] text-text-tertiary">
            {school.schools.conference}
          </span>
        )}
      </div>

      <p className="text-text-tertiary text-[11px]">
        Last contact: {getLastContact()}
      </p>

      {/* 3-dot menu */}
      <div className="absolute top-2 right-8">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-navy-800"
        >
          <MoreVertical size={16} className="text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-navy-800 border border-gray-600 rounded-lg py-2 min-w-[150px] z-20">
            <button
              onClick={() => {
                onEmailCoach(school)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-white text-sm hover:bg-navy-700"
            >
              Email Coach
            </button>
            <button
              onClick={() => {
                onViewSchool(school)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-white text-sm hover:bg-navy-700"
            >
              View School
            </button>

            <div className="border-t border-gray-600 my-2"></div>

            {STAGES.filter(stage => stage.id !== school.stage).map(stage => (
              <button
                key={stage.id}
                onClick={() => {
                  onChangeStage(school, stage.id)
                  setShowMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-blue-400 text-sm hover:bg-navy-700"
              >
                Move to {stage.name}
              </button>
            ))}

            <div className="border-t border-gray-600 my-2"></div>

            <button
              onClick={() => {
                onRemove(school)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-red-400 text-sm hover:bg-navy-700"
            >
              Remove from Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SchoolCardPreview({ school }) {
  if (!school) return null

  const fitScore = school.quiz_responses ? calculateFitScore(school, school.quiz_responses, school.profile) : null
  const fitBadge = fitScore ? getFitScoreBadge(fitScore, true) : null

  return (
    <div className="bg-navy-900 rounded-lg p-4 opacity-90 rotate-2 shadow-xl border border-club-primary border-opacity-30">
      {/* Fit score badge */}
      {fitScore && (
        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${fitBadge.className} z-10`}>
          {fitScore}
        </span>
      )}

      <h3 className="text-white font-semibold text-sm mb-2 pr-8 truncate">
        {school.schools?.name || school.school}
      </h3>

      {school.schools?.division && (
        <span
          className="inline-block px-2 py-1 rounded text-xs font-bold text-white"
          style={{ backgroundColor: school.schools?.primary_color || '#dc2626' }}
        >
          {school.schools.division}
        </span>
      )}
    </div>
  )
}

function Column({ stage, schools, onEmailCoach, onViewSchool, onRemove, onChangeStage }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.id}`,
    data: { type: 'column', stage: stage.id }
  })

  return (
    <div
      ref={setNodeRef}
      className={`design-card p-4 min-h-[400px] min-w-[280px] transition-all duration-200 ${
        isOver ? 'bg-card-hover ring-2 ring-eastside-crimson ring-opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-[16px] font-medium">{stage.name}</h2>
        <span className={`${stage.color} ${stage.textColor} text-[10px] px-2 py-1 rounded-full font-medium`}>
          {schools.length}
        </span>
      </div>

      <SortableContext items={schools.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {schools.length > 0 ? (
          schools.map(school => (
            <SchoolCard
              key={school.id}
              school={school}
              onEmailCoach={onEmailCoach}
              onViewSchool={onViewSchool}
              onRemove={onRemove}
              onChangeStage={onChangeStage}
            />
          ))
        ) : (
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isOver ? 'border-eastside-crimson bg-eastside-crimson bg-opacity-10' : 'border-card-border'
          }`} style={{ pointerEvents: 'none' }}>
            <p className={`text-[13px] ${isOver ? 'text-eastside-crimson' : 'text-text-tertiary'}`}>
              Drop schools here
            </p>
          </div>
        )}
      </SortableContext>
    </div>
  )
}

export default function MySchools() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [expandedSections, setExpandedSections] = useState({ interested: true })
  const [showStageModal, setShowStageModal] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }  // 5px movement before drag starts
    })
  )

  useEffect(() => {
    if (user?.id) {
      loadPipeline(user.id)
    }
  }, [user?.id])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const loadPipeline = async (userId) => {
    if (!userId) return

    try {
      // Step 1: Get pipeline data
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('athlete_id', userId)

      if (error) throw error

      // Step 2: Lookup school details for each pipeline entry
      const pipelinesWithSchools = []
      for (const pipeline of data || []) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('name', pipeline.school)
          .single()

        const merged = {
          ...(schoolData || {}),         // school fields at top level
          ...pipeline,                  // pipeline fields override (id, stage, etc.)
          name: schoolData?.name || pipeline.school,  // fallback to text name
          schools: schoolData || { name: pipeline.school }   // also keep nested for components that expect it
        }

        pipelinesWithSchools.push(merged)
      }

      setSchools(pipelinesWithSchools)
    } catch (error) {
      console.error('Error loading pipeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event) => {
    console.log('🟡 Drag started:', event.active.id)
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const draggedSchool = schools.find(s => s.id === active.id)
    if (!draggedSchool) return

    // Determine destination stage
    let destStage
    if (over.data.current?.type === 'column') {
      destStage = over.data.current.stage
    } else {
      const overSchool = schools.find(s => s.id === over.id)
      if (!overSchool) return
      destStage = overSchool.stage
    }

    if (destStage === draggedSchool.stage) return // no change

    // Optimistic update
    const oldStage = draggedSchool.stage
    setSchools(prev => prev.map(school =>
      school.id === draggedSchool.id
        ? { ...school, stage: destStage, stage_updated_at: new Date().toISOString() }
        : school
    ))

    // Persist to database
    try {
      const { error } = await supabase
        .from('pipelines')
        .update({
          stage: destStage,
          stage_updated_at: new Date().toISOString()
        })
        .eq('id', draggedSchool.id)

      if (error) {
        console.error('Drag persist failed:', error)
        // Revert
        setSchools(prev => prev.map(school =>
          school.id === draggedSchool.id
            ? { ...school, stage: oldStage }
            : school
        ))
      }
    } catch (error) {
      console.error('Drag persist failed:', error)
      // Revert
      setSchools(prev => prev.map(school =>
        school.id === draggedSchool.id
          ? { ...school, stage: oldStage }
          : school
      ))
    }
  }

  const handleRemoveSchool = async (school) => {
    if (!confirm(`Remove ${school.schools?.name || 'this school'} from your pipeline?`)) return

    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', school.id)

      if (error) throw error

      setSchools(schools.filter(s => s.id !== school.id))
    } catch (error) {
      console.error('Error removing school:', error)
    }
  }

  const handleChangeStage = async (school, newStage) => {
    const stageName = STAGES.find(s => s.id === newStage)?.name || newStage
    console.log('🔄 Changing stage:', school.schools?.name, 'to', stageName)

    try {
      // Update database
      const { error } = await supabase
        .from('pipelines')
        .update({
          stage: newStage,
          stage_updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', school.id)

      if (error) throw error

      // Update local state
      setSchools(schools.map(s =>
        s.id === school.id
          ? { ...s, stage: newStage, stage_updated_at: new Date().toISOString() }
          : s
      ))

      // Log activity
      await logActivity(user.id, 'stage_changed', {
        school_name: school.schools?.name || school.school,
        from_stage: school.stage,
        to_stage: newStage
      })

      console.log('✅ Stage changed successfully')
    } catch (error) {
      console.error('❌ Error changing stage:', error)
    }
  }

  const groupedSchools = STAGES.reduce((acc, stage) => {
    acc[stage.id] = schools.filter(school => school.stage === stage.id)
    return acc
  }, {})

  const toggleSection = (stageId) => {
    setExpandedSections(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }))
  }

  // Mobile Components
  const MobileSchoolCard = ({ school, onChangeStage }) => {
    const schoolName = school.schools?.name || school.school
    const schoolColors = getSchoolColors(schoolName)
    const accentColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary
    const tintColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary
    const fitScore = school.quiz_responses ? calculateFitScore(school, school.quiz_responses, school.profile) : null
    const fitBadge = fitScore ? getFitScoreBadge(fitScore, true) : null

    const getLastContact = () => {
      if (school.last_outreach_date) {
        const daysSince = Math.floor((new Date() - new Date(school.last_outreach_date)) / (1000 * 60 * 60 * 24))
        return daysSince === 0 ? 'Today' : `${daysSince}d ago`
      }
      return 'Never contacted'
    }

    return (
      <div
        style={{
          borderLeft: `3px solid ${accentColor}`,
          background: `linear-gradient(135deg, ${tintColor}10 0%, ${tintColor}05 50%, transparent 100%), #111827`
        }}
        className="rounded-lg p-4 mb-3 border border-card-border border-l-0 relative"
      >
        {fitScore && (
          <span className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold ${fitBadge.className} z-10`}>
            {fitScore}
          </span>
        )}

        <div className="flex items-center gap-3 mb-3 pr-12">
          <SchoolBadge schoolName={schoolName} size="md" />
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm truncate">
              {schoolName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {school.schools?.division && (
                <span className="px-2 py-1 rounded text-xs font-medium text-white bg-text-muted">
                  {school.schools.division}
                </span>
              )}
              {school.schools?.conference && (
                <span className="text-xs text-text-tertiary">
                  {school.schools.conference}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-text-tertiary text-xs mb-3">
          Last contact: {getLastContact()}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setShowStageModal(school)}
            className="flex-1 bg-eastside-crimson text-white px-3 py-2 rounded text-xs font-medium"
          >
            Change Stage
          </button>
          <button
            onClick={() => setSelectedSchool(school)}
            className="flex-1 bg-navy-700 text-white px-3 py-2 rounded text-xs font-medium border border-gray-600"
          >
            View Details
          </button>
        </div>
      </div>
    )
  }

  const MobileStageView = () => {
    return (
      <div className="space-y-4">
        {STAGES.map(stage => {
          const stageSchools = groupedSchools[stage.id] || []
          const isExpanded = expandedSections[stage.id]

          return (
            <div key={stage.id} className="design-card overflow-hidden">
              <button
                onClick={() => toggleSection(stage.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-white text-sm font-medium">{stage.name}</h2>
                  <span className={`${stage.color} ${stage.textColor} text-xs px-2 py-1 rounded-full font-medium`}>
                    {stageSchools.length}
                  </span>
                </div>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  {stageSchools.length > 0 ? (
                    stageSchools.map(school => (
                      <MobileSchoolCard
                        key={school.id}
                        school={school}
                        onChangeStage={(school) => setShowStageModal(school)}
                      />
                    ))
                  ) : (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                      <p className="text-text-tertiary text-sm">No schools in {stage.name.toLowerCase()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const StageModal = ({ school, onClose, onChangeStage }) => {
    if (!school) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
        <div className="bg-navy-900 w-full rounded-t-xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Move {school.schools?.name || school.school}</h3>
            <button onClick={onClose} className="text-gray-400 text-xl">×</button>
          </div>

          <div className="space-y-2">
            {STAGES.filter(stage => stage.id !== school.stage).map(stage => (
              <button
                key={stage.id}
                onClick={() => {
                  onChangeStage(school, stage.id)
                  onClose()
                }}
                className="w-full text-left p-3 rounded bg-navy-800 text-white hover:bg-navy-700 transition-colors"
              >
                Move to {stage.name}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 p-3 bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-4 md:p-8">
          <div className="text-white">Loading pipeline...</div>
        </div>
      </AthleteLayout>
    )
  }

  return (
    <AthleteLayout>
      <div className="max-w-full overflow-x-hidden px-4 md:px-8 py-8">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.01em', margin: 0 }}>MY SCHOOLS</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Track every school in your recruiting pipeline</p>
        </div>

        {schools.length === 0 && (
          <div className="design-card p-6 mb-6 text-center">
            <p className="text-text-secondary mb-3 text-[13px]">No schools in your pipeline yet</p>
            <button
              onClick={() => navigate('/coach-finder')}
              className="text-eastside-gold text-[11px] hover:text-white transition-colors"
            >
              FIND SCHOOLS →
            </button>
          </div>
        )}

{isMobile ? (
          <MobileStageView />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-max">
                {STAGES.map(stage => (
                  <Column
                    key={stage.id}
                    stage={stage}
                    schools={groupedSchools[stage.id] || []}
                    onEmailCoach={(school) => navigate(`/outreach?school=${encodeURIComponent(school.schools?.name || school.school)}`)}
                    onViewSchool={setSelectedSchool}
                    onRemove={handleRemoveSchool}
                    onChangeStage={handleChangeStage}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeId ? (
                <SchoolCardPreview school={schools.find(s => s.id === activeId)} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* School Detail Modal */}
        <SchoolDetailModal
          school={selectedSchool}
          isOpen={selectedSchool !== null}
          onClose={() => setSelectedSchool(null)}
          athleteProfile={profile}
          onAddToPipeline={() => {}} // No-op since already in pipeline
          onRemoveFromPipeline={handleRemoveSchool}
          isInPipeline={true}
          fitScore={selectedSchool ? calculateFitScore(selectedSchool, null, profile) : null}
        />

        {/* Mobile Stage Change Modal */}
        {showStageModal && (
          <StageModal
            school={showStageModal}
            onClose={() => setShowStageModal(null)}
            onChangeStage={handleChangeStage}
          />
        )}
      </div>
    </AthleteLayout>
  )
}