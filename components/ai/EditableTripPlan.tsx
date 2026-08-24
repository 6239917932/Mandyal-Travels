'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import styles from '@/components/ai/EditableTripPlan.module.css';
import { Button } from '@/components/ui/Button';
import {
  boundEditableTripPlanText,
  EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH,
  EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH,
  finalizeEditableTripPlanText,
} from '@/services/editableTripPlanRules';
import type { TripPlannerDay, TripPlannerResult } from '@/types/ai';

type EditableTripPlanProps = {
  result: TripPlannerResult;
};

type EditableField = 'guidance' | 'title';

function cloneDays(days: TripPlannerDay[]): TripPlannerDay[] {
  return days.map((day) => ({ ...day }));
}

export function EditableTripPlan({ result }: EditableTripPlanProps) {
  const idPrefix = useId().replaceAll(':', '');
  const [days, setDays] = useState<TripPlannerDay[]>(() => cloneDays(result.days));
  const [status, setStatus] = useState('');
  const changed = days.some(
    (day, index) =>
      day.title !== result.days[index]?.title || day.guidance !== result.days[index]?.guidance,
  );

  function updateDay(index: number, field: EditableField, value: string) {
    const maximum =
      field === 'title'
        ? EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH
        : EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH;
    setDays((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index ? { ...day, [field]: boundEditableTripPlanText(value, maximum) } : day,
      ),
    );
    setStatus('');
  }

  function finalizeDay(index: number, field: EditableField) {
    const suggestion = result.days[index]?.[field];
    if (!suggestion) return;
    const maximum =
      field === 'title'
        ? EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH
        : EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH;
    setDays((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index
          ? {
              ...day,
              [field]: finalizeEditableTripPlanText(day[field], suggestion, maximum),
            }
          : day,
      ),
    );
  }

  function resetPlan() {
    setDays(cloneDays(result.days));
    setStatus('Your edits were reset to the original suggestion.');
  }

  return (
    <section aria-labelledby={`${idPrefix}-heading`} className="trip-planner__result">
      <div className={styles.header}>
        <div>
          <h2 id={`${idPrefix}-heading`}>Your editable suggested trip</h2>
          <p>{result.summary}</p>
        </div>
        <Button disabled={!changed} onClick={resetPlan} variant="secondary">
          Reset to suggestion
        </Button>
      </div>

      <p className="trip-planner__disclosure">{result.disclosure}</p>
      <p className={styles.notice} id={`${idPrefix}-editing-notice`}>
        <strong>Edits stay only in this browser view.</strong> They disappear if you refresh or
        leave this page. Editing this suggestion does not save a trip, reserve inventory, or create
        a booking.
      </p>

      <div className={styles.days}>
        {days.map((day, index) => {
          const titleId = `${idPrefix}-day-${day.day}-title`;
          const guidanceId = `${idPrefix}-day-${day.day}-guidance`;
          return (
            <article className={styles.day} key={`${day.day}-${day.date}`}>
              <span className={styles.dayMeta}>
                Day {day.day} · {day.date}
              </span>
              <div className={styles.field}>
                <label htmlFor={titleId}>Day {day.day} title</label>
                <input
                  aria-describedby={`${titleId}-count ${idPrefix}-editing-notice`}
                  id={titleId}
                  maxLength={EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH}
                  onBlur={() => finalizeDay(index, 'title')}
                  onChange={(event) => updateDay(index, 'title', event.currentTarget.value)}
                  value={day.title}
                />
                <span className={styles.count} id={`${titleId}-count`}>
                  {day.title.length}/{EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH} characters
                </span>
              </div>
              <div className={styles.field}>
                <label htmlFor={guidanceId}>Day {day.day} guidance</label>
                <textarea
                  aria-describedby={`${guidanceId}-count ${idPrefix}-editing-notice`}
                  id={guidanceId}
                  maxLength={EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH}
                  onBlur={() => finalizeDay(index, 'guidance')}
                  onChange={(event) => updateDay(index, 'guidance', event.currentTarget.value)}
                  value={day.guidance}
                />
                <span className={styles.count} id={`${guidanceId}-count`}>
                  {day.guidance.length}/{EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH} characters
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <h2 className={styles.linksHeading}>Verify live travel options</h2>
      <div className="trip-planner__links">
        {result.links.map((link) => (
          <Link href={link.href} key={link.product}>
            {link.label}
          </Link>
        ))}
      </div>
      <p aria-live="polite" className={styles.status} role="status">
        {status}
      </p>
    </section>
  );
}
