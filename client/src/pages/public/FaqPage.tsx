import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does number calling work in Dagi Bingo?',
      a: 'Numbers are generated exclusively on the authoritative backend server using a cryptographically sound Fisher-Yates shuffle of 75 balls. When each ball is drawn, it is broadcast via WebSockets to all room participants simultaneously and called out aloud using the browser Web Speech synthesizer.',
    },
    {
      q: 'What is DEMO Sandbox Mode?',
      a: 'Dagi Bingo operates in a simulated demo environment (GAME_MODE=DEMO) utilizing virtual ETB test credits. Players can practice, compete, test patterns, and explore wallet double-entry ledger mechanisms without risking real money.',
    },
    {
      q: 'How do I claim a winning Bingo card?',
      a: 'As soon as your card matches the room winning pattern (such as Classic line, Full House, or Four Corners), click the large golden "BINGO!" button. The server will immediately verify the validity of your ticket against all numbers called so far.',
    },
    {
      q: 'How does Auto-Daub work?',
      a: 'When you enable the "⚡ Auto-Daub" toggle on your game screen, any matching numbers drawn by the server caller are stamped automatically on your cards in real time, so you never miss a call.',
    },
    {
      q: 'Can I play with multiple cards in one game?',
      a: 'Yes! When entering any live room, you can select between 1, 2, 3, or 4 simultaneous 5x5 tickets. You can easily toggle between your cards using the card switcher tabs.',
    },
    {
      q: 'What is KYC Identity Verification in the platform?',
      a: 'For simulated regulatory compliance, users can submit identification documents (National ID, Passport, Driver’s License) in their profile settings. Admins review and verify records in the Admin Suite.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <Badge variant="cyan">Support & Answers</Badge>
        <h1 className="text-4xl md:text-5xl font-black font-display text-arena-text tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-arena-muted max-w-lg mx-auto">
          Find instant answers to common questions about gameplay, rules, audio calling, and virtual wallets.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <Card
              key={idx}
              elevated
              className="p-5 cursor-pointer transition-all duration-200 border-arena-border hover:border-indigo-500/40"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold font-display text-arena-text">{faq.q}</h3>
                <div className="w-8 h-8 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-muted flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-arena-border text-xs sm:text-sm text-arena-muted leading-relaxed animate-pop-in">
                  {faq.a}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
