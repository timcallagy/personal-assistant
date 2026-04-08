'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { babblo, type BabbloTranscript } from '@/lib/api';

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function CallTranscriptPage() {
  const params = useParams();
  const userId = decodeURIComponent(params['userId'] as string);
  const sessionId = decodeURIComponent(params['sessionId'] as string);

  const [data, setData] = useState<BabbloTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    babblo
      .getCallTranscript(userId, sessionId)
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load transcript');
      })
      .finally(() => setLoading(false));
  }, [userId, sessionId]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-foreground-secondary text-sm">Loading...</div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-red-600 text-sm mb-4">{error ?? 'Transcript not found.'}</p>
          <Link href={`/babblo/${encodeURIComponent(userId)}#call-history`} className="text-accent hover:underline text-sm">
            ← Back to call history
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl">
        <Link
          href={`/babblo/${encodeURIComponent(userId)}#call-history`}
          className="text-accent hover:underline text-sm"
        >
          ← Back to call history
        </Link>

        {/* Header */}
        <div className="bg-background-secondary rounded-lg border border-background-tertiary p-5">
          <h1 className="text-xl font-bold text-foreground mb-3">Call Transcript</h1>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-foreground-secondary">Date</dt>
              <dd>{fmtDate(data.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Duration</dt>
              <dd className="font-mono">{fmt(data.durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Language</dt>
              <dd>{data.language}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Persona</dt>
              <dd>{data.personaName}</dd>
            </div>
          </dl>
        </div>

        {/* Transcript */}
        <div className="space-y-3">
          {data.messages.length === 0 ? (
            <p className="text-foreground-secondary text-sm">No messages recorded for this call.</p>
          ) : (
            data.messages.map((msg) => {
              const isUser = msg.speaker === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm max-w-[75%] ${
                      isUser
                        ? 'bg-accent text-white rounded-tr-sm'
                        : 'bg-background-secondary border border-background-tertiary text-foreground rounded-tl-sm'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${isUser ? 'text-white/70' : 'text-foreground-secondary'}`}>
                      {isUser ? '[User]' : `[AI - ${data.personaName}]`}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
