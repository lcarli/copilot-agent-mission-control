import { useState } from 'react';

export interface SpecialistAgentNode {
  readonly agentId: string;
  readonly role: string;
  readonly status: 'idle' | 'working' | 'reviewing' | 'blocked';
  readonly tools: readonly string[];
  readonly latencyMs: number;
  readonly toolCalls: number;
  readonly x: number;
  readonly y: number;
}

export interface SpecialistHandoff {
  readonly handoffId: string;
  readonly fromAgentId: string;
  readonly toAgentId: string;
  readonly status: 'active' | 'completed' | 'failed';
  readonly evidenceCount: number;
}

export interface SpecialistReview {
  readonly reviewId: string;
  readonly reviewerAgentId: string;
  readonly subjectAgentId: string;
  readonly outcome: 'approved' | 'changes-requested';
}

export interface SpecialistDisagreement {
  readonly disagreementId: string;
  readonly agentIds: readonly string[];
  readonly topic: string;
  readonly status: 'unresolved' | 'escalated' | 'resolved';
}

export interface SpecialistTopologyViewProps {
  readonly agents?: readonly SpecialistAgentNode[];
  readonly disagreements?: readonly SpecialistDisagreement[];
  readonly handoffs?: readonly SpecialistHandoff[];
  readonly reviews?: readonly SpecialistReview[];
  readonly translate: (key: string) => string;
}

const agents: readonly SpecialistAgentNode[] = [
  {
    agentId: 'orchestrator',
    latencyMs: 420,
    role: 'Response Orchestrator',
    status: 'working',
    toolCalls: 7,
    tools: ['mission-state', 'handoff-router'],
    x: 50,
    y: 16,
  },
  {
    agentId: 'weather',
    latencyMs: 310,
    role: 'Weather Specialist',
    status: 'idle',
    toolCalls: 3,
    tools: ['weather-observations'],
    x: 18,
    y: 52,
  },
  {
    agentId: 'infrastructure',
    latencyMs: 510,
    role: 'Infrastructure Specialist',
    status: 'working',
    toolCalls: 5,
    tools: ['grid-status', 'shelter-capacity'],
    x: 50,
    y: 62,
  },
  {
    agentId: 'logistics',
    latencyMs: 460,
    role: 'Logistics Specialist',
    status: 'blocked',
    toolCalls: 4,
    tools: ['transport-routes'],
    x: 82,
    y: 52,
  },
  {
    agentId: 'reviewer',
    latencyMs: 280,
    role: 'Decision Reviewer',
    status: 'reviewing',
    toolCalls: 2,
    tools: ['evidence-review'],
    x: 50,
    y: 88,
  },
];

const handoffs: readonly SpecialistHandoff[] = [
  {
    evidenceCount: 4,
    fromAgentId: 'orchestrator',
    handoffId: 'handoff-weather',
    status: 'completed',
    toAgentId: 'weather',
  },
  {
    evidenceCount: 6,
    fromAgentId: 'orchestrator',
    handoffId: 'handoff-infrastructure',
    status: 'active',
    toAgentId: 'infrastructure',
  },
  {
    evidenceCount: 3,
    fromAgentId: 'orchestrator',
    handoffId: 'handoff-logistics',
    status: 'failed',
    toAgentId: 'logistics',
  },
  {
    evidenceCount: 8,
    fromAgentId: 'infrastructure',
    handoffId: 'handoff-review',
    status: 'active',
    toAgentId: 'reviewer',
  },
];

const reviews: readonly SpecialistReview[] = [
  {
    outcome: 'approved',
    reviewId: 'review-weather',
    reviewerAgentId: 'reviewer',
    subjectAgentId: 'weather',
  },
  {
    outcome: 'changes-requested',
    reviewId: 'review-logistics',
    reviewerAgentId: 'reviewer',
    subjectAgentId: 'logistics',
  },
];

const disagreements: readonly SpecialistDisagreement[] = [
  {
    agentIds: ['weather', 'logistics'],
    disagreementId: 'route-weather-conflict',
    status: 'escalated',
    topic: 'Coastal route safety window',
  },
];

export function SpecialistTopologyView({
  agents: agentData = agents,
  disagreements: disagreementData = disagreements,
  handoffs: handoffData = handoffs,
  reviews: reviewData = reviews,
  translate: t,
}: SpecialistTopologyViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(agentData[0]?.agentId);
  const selected = agentData.find(({ agentId }) => agentId === selectedAgentId);
  const nodeById = new Map(agentData.map((agent) => [agent.agentId, agent]));

  return (
    <section className="topology-view" aria-labelledby="topology-title">
      <div className="topology-heading">
        <div>
          <p className="eyebrow">{t('topology.eyebrow')}</p>
          <h2 id="topology-title">{t('topology.title')}</h2>
          <p>{t('topology.description')}</p>
        </div>
        <dl>
          <div>
            <dt>{t('topology.activeAgents')}</dt>
            <dd>
              {agentData.filter(({ status }) => status !== 'idle').length}
            </dd>
          </div>
          <div>
            <dt>{t('topology.openConflicts')}</dt>
            <dd>
              {
                disagreementData.filter(({ status }) => status !== 'resolved')
                  .length
              }
            </dd>
          </div>
        </dl>
      </div>

      <div className="topology-grid">
        <section className="panel topology-canvas">
          <svg
            aria-hidden="true"
            className="topology-edges"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {handoffData.map((handoff) => {
              const from = nodeById.get(handoff.fromAgentId);
              const to = nodeById.get(handoff.toAgentId);
              if (from === undefined || to === undefined) return null;
              return (
                <line
                  className={`handoff-edge handoff-${handoff.status}`}
                  key={handoff.handoffId}
                  vectorEffect="non-scaling-stroke"
                  x1={from.x}
                  x2={to.x}
                  y1={from.y}
                  y2={to.y}
                />
              );
            })}
          </svg>
          {agentData.map((agent) => (
            <button
              aria-current={
                agent.agentId === selectedAgentId ? 'true' : undefined
              }
              className={`agent-node agent-${agent.status}`}
              key={agent.agentId}
              onClick={() => {
                setSelectedAgentId(agent.agentId);
              }}
              style={{
                left: `${String(agent.x)}%`,
                top: `${String(agent.y)}%`,
              }}
              type="button"
            >
              <strong>{agent.role}</strong>
              <span>{t(`topology.status.${agent.status}`)}</span>
            </button>
          ))}
        </section>

        <aside className="panel agent-detail">
          <div className="panel-heading">
            <h3>{t('topology.agentDetail')}</h3>
          </div>
          {selected === undefined ? null : (
            <div className="agent-detail-content">
              <h4>{selected.role}</h4>
              <dl>
                <div>
                  <dt>{t('topology.status')}</dt>
                  <dd>{t(`topology.status.${selected.status}`)}</dd>
                </div>
                <div>
                  <dt>{t('topology.latency')}</dt>
                  <dd>{selected.latencyMs} ms</dd>
                </div>
                <div>
                  <dt>{t('topology.toolCalls')}</dt>
                  <dd>{selected.toolCalls}</dd>
                </div>
              </dl>
              <h4>{t('topology.tools')}</h4>
              <ul className="tool-list">
                {selected.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="panel topology-events">
          <div className="panel-heading">
            <h3>{t('topology.activity')}</h3>
          </div>
          <ul>
            {handoffData.map((handoff) => (
              <li key={handoff.handoffId}>
                <span className={`event-symbol handoff-${handoff.status}`}>
                  →
                </span>
                <span>
                  <strong>{t('topology.handoff')}</strong>
                  {nodeById.get(handoff.fromAgentId)?.role} →{' '}
                  {nodeById.get(handoff.toAgentId)?.role}
                  <small>
                    {handoff.evidenceCount} {t('topology.evidenceItems')} ·{' '}
                    {t(`topology.handoffStatus.${handoff.status}`)}
                  </small>
                </span>
              </li>
            ))}
            {reviewData.map((review) => (
              <li key={review.reviewId}>
                <span className="event-symbol review-symbol">✓</span>
                <span>
                  <strong>{t('topology.review')}</strong>
                  {nodeById.get(review.reviewerAgentId)?.role} →{' '}
                  {nodeById.get(review.subjectAgentId)?.role}
                  <small>{t(`topology.reviewOutcome.${review.outcome}`)}</small>
                </span>
              </li>
            ))}
            {disagreementData.map((disagreement) => (
              <li key={disagreement.disagreementId}>
                <span className="event-symbol disagreement-symbol">!</span>
                <span>
                  <strong>{t('topology.disagreement')}</strong>
                  {disagreement.topic}
                  <small>
                    {t(`topology.conflictStatus.${disagreement.status}`)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
