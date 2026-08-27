import React from 'react';
import { ShieldCheck, Lock, Database, Terminal, Cpu, Network, X, Check } from 'lucide-react';
import type { ThreatZoneCountermeasure } from '../types';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THREAT_ZONES: ThreatZoneCountermeasure[] = [
  {
    zone: '1. Input Surfaces',
    threat: 'Malicious user uploads, prompt injection payloads, oversized request bodies.',
    owaspRef: 'OWASP LLM01 / A03',
    countermeasure: 'Strict input typing, JSON payload size limiting (10MB max), defensive destructuring with fallback defaults, and treating raw prompt text as plain un-executed data.',
    status: 'Enforced',
  },
  {
    zone: '2. Planning & Reasoning',
    threat: 'System instruction bypass, behavioral drift, unwanted diagnostic advice generation.',
    owaspRef: 'OWASP LLM02 / LLM07',
    countermeasure: 'Strictly bounded system instructions with Socratic non-prescriptive framing, structured JSON schema response enforcement, and temperature control (0.7).',
    status: 'Enforced',
  },
  {
    zone: '3. Tool & AI Execution',
    threat: 'API rate-limit disruption, 503 unavailability, dynamic code execution risks.',
    owaspRef: 'OWASP LLM04 / A05',
    countermeasure: 'Multi-tiered Resilient Model Fallback Ladder (gemini-2.5-flash -> gemini-2.5-flash-lite -> gemini-flash-latest -> gemini-2.5-pro) with error recovery matrix.',
    status: 'Enforced',
  },
  {
    zone: '4. Memory & State Persistence',
    threat: 'Cross-user data leakage, unauthorized reads/writes in Firestore, undefined payload driver crashes.',
    owaspRef: 'OWASP A01 / A04',
    countermeasure: 'Strict owner-bound path isolation (`/users/{userId}/journal_entries/{id}`), enforced `request.auth.uid == userId` rules, and recursive undefined-value stripping.',
    status: 'Enforced',
  },
  {
    zone: '5. Inter-System Communication',
    threat: 'Client-side API key exposure, token leakage in browser devtools, insecure server endpoints.',
    owaspRef: 'OWASP A02 / LLM06',
    countermeasure: 'Zero hardcoded secrets; GEMINI_API_KEY is strictly server-side; federated Google OAuth with Firebase Auth tokens; secure reverse-proxy routing on port 3000.',
    status: 'Enforced',
  },
];

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="threat-model-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs animate-fadeIn font-serif"
      onClick={onClose}
    >
      <div
        id="threat-model-dialog"
        className="bg-white border border-[#EBE8E4] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#EBE8E4] bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-xl font-light italic text-[#1A1A1A] leading-tight">
                Architectural Threat Model & Security Directives
              </h3>
              <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#7D7A74] mt-0.5">
                Structured 5-Zone Analysis & Countermeasure Matrix (OWASP Top 10 + LLM Standard)
              </p>
            </div>
          </div>
          <button
            id="close-threat-modal-btn"
            onClick={onClose}
            className="p-2 border border-[#EBE8E4] bg-white text-[#7D7A74] hover:text-[#1A1A1A] hover:bg-[#FAF9F6] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin">
          {/* Executive Overview */}
          <div className="p-4 bg-[#FAF9F6] border border-[#EBE8E4] flex items-start gap-3">
            <Lock className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
            <div className="text-xs text-[#4A4844] leading-relaxed font-sans">
              <span className="font-bold text-[#1A1A1A]">Zero-Trust Principle Enforced: </span>
              All conversational interactions, journal entries, and generated weekly digests are isolated to the authenticated user's private UID tree in Cloud Firestore. No client-side code possesses Gemini API keys or administrative database bypasses.
            </div>
          </div>

          {/* Threat Matrix Table */}
          <div className="border border-[#EBE8E4] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[#FAF9F6] text-[#1A1A1A] font-bold text-[10px] uppercase tracking-[0.15em] border-b border-[#EBE8E4]">
                <tr>
                  <th className="py-3 px-4 border-r border-[#EBE8E4]">Threat Zone</th>
                  <th className="py-3 px-4 border-r border-[#EBE8E4]">Vulnerability Scenario</th>
                  <th className="py-3 px-4 border-r border-[#EBE8E4]">OWASP Mapping</th>
                  <th className="py-3 px-4 border-r border-[#EBE8E4]">Architectural Countermeasure</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE8E4]">
                {THREAT_ZONES.map((zone, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF9F6]/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1A1A1A] align-top whitespace-nowrap border-r border-[#EBE8E4]">
                      {zone.zone}
                    </td>
                    <td className="py-3.5 px-4 text-[#4A4844] align-top leading-relaxed border-r border-[#EBE8E4]">
                      {zone.threat}
                    </td>
                    <td className="py-3.5 px-4 text-[#2B5A82] font-mono text-[11px] align-top whitespace-nowrap border-r border-[#EBE8E4]">
                      {zone.owaspRef}
                    </td>
                    <td className="py-3.5 px-4 text-[#4A4844] align-top leading-relaxed border-r border-[#EBE8E4]">
                      {zone.countermeasure}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A]">
                        <Check className="w-3 h-3 text-[#1A1A1A]" />
                        {zone.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Firestore Rules Blueprint Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#7D7A74] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#1A1A1A]" />
                Deployed Firestore Security Rules (`firestore.rules`)
              </h4>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] bg-[#FAF9F6] px-2.5 py-0.5 border border-[#EBE8E4]">
                Active Policy
              </span>
            </div>
            <pre className="p-4 bg-[#1A1A1A] text-[#FDFCFB] font-mono text-[11px] leading-relaxed overflow-x-auto border border-[#1A1A1A]">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // Deny root access by default
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /journal_entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /weekly_digests/{digestId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-[#EBE8E4] bg-[#FAF9F6] flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
          <p className="text-[10px] uppercase tracking-wider text-[#7D7A74]">
            Validated against OWASP Top 10 for LLM Applications (2025/2026 Standard)
          </p>
          <button
            id="threat-modal-confirm-btn"
            onClick={onClose}
            className="px-6 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-bold uppercase tracking-widest shadow-xs transition cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
