import { describe, it, expect } from '@jest/globals';
import {
  getSessionUrl,
  getResultsUrl,
  getSessionTakingUrl,
  getAnalyzingUrl,
  getSessionActionLabel,
  getSessionPrimaryAction,
  SessionType,
  SessionStatus,
} from '../navigation-utils';

describe('Navigation Utils', () => {
  describe('getSessionUrl', () => {
    describe('Practice Sessions', () => {
      it('should generate correct URL for created practice session', () => {
        const url = getSessionUrl('abc123', 'practice', 'created');
        expect(url).toBe('/practice/session/abc123');
      });

      it('should generate correct URL for in-progress practice session', () => {
        const url = getSessionUrl('abc123', 'practice', 'in_progress');
        expect(url).toBe('/practice/session/abc123');
      });

      it('should generate correct URL for completed practice session', () => {
        const url = getSessionUrl('abc123', 'practice', 'completed');
        expect(url).toBe('/practice/session/abc123/analyzing');
      });

      it('should generate correct URL for analyzed practice session', () => {
        const url = getSessionUrl('abc123', 'practice', 'analyzed');
        expect(url).toBe('/practice/session/abc123/results');
      });
    });

    describe('Exam Sessions', () => {
      it('should generate correct URL for created exam', () => {
        const url = getSessionUrl('xyz789', 'exam', 'created');
        expect(url).toBe('/exam/xyz789');
      });

      it('should generate correct URL for in-progress exam', () => {
        const url = getSessionUrl('xyz789', 'exam', 'in_progress');
        expect(url).toBe('/exam/xyz789');
      });

      it('should generate correct URL for completed exam', () => {
        const url = getSessionUrl('xyz789', 'exam', 'completed');
        expect(url).toBe('/exam/xyz789/results');
      });

      it('should generate correct URL for analyzed exam', () => {
        const url = getSessionUrl('xyz789', 'exam', 'analyzed');
        expect(url).toBe('/exam/xyz789/results');
      });
    });
  });

  describe('getResultsUrl', () => {
    it('should generate correct results URL for practice', () => {
      const url = getResultsUrl('abc123', 'practice');
      expect(url).toBe('/practice/session/abc123/results');
    });

    it('should generate correct results URL for exam', () => {
      const url = getResultsUrl('xyz789', 'exam');
      expect(url).toBe('/exam/xyz789/results');
    });
  });

  describe('getSessionTakingUrl', () => {
    it('should generate correct taking URL for practice', () => {
      const url = getSessionTakingUrl('abc123', 'practice');
      expect(url).toBe('/practice/session/abc123');
    });

    it('should generate correct taking URL for exam', () => {
      const url = getSessionTakingUrl('xyz789', 'exam');
      expect(url).toBe('/exam/xyz789');
    });
  });

  describe('getAnalyzingUrl', () => {
    it('should generate analyzing URL for practice', () => {
      const url = getAnalyzingUrl('abc123', 'practice');
      expect(url).toBe('/practice/session/abc123/analyzing');
    });

    it('should redirect to results for exam (no analyzing state)', () => {
      const url = getAnalyzingUrl('xyz789', 'exam');
      expect(url).toBe('/exam/xyz789/results');
    });
  });

  describe('getSessionActionLabel', () => {
    it('should return correct label for analyzed status', () => {
      const label = getSessionActionLabel('analyzed');
      expect(label).toBe('View Results');
    });

    it('should return correct label for completed status', () => {
      const label = getSessionActionLabel('completed');
      expect(label).toBe('Analyze Session');
    });

    it('should return correct label for created status', () => {
      const label = getSessionActionLabel('created');
      expect(label).toBe('Start');
    });

    it('should return correct label for in_progress status', () => {
      const label = getSessionActionLabel('in_progress');
      expect(label).toBe('Continue');
    });
  });

  describe('getSessionPrimaryAction', () => {
    it('should return view-results for analyzed status', () => {
      const action = getSessionPrimaryAction('analyzed');
      expect(action).toBe('view-results');
    });

    it('should return analyze for completed status', () => {
      const action = getSessionPrimaryAction('completed');
      expect(action).toBe('analyze');
    });

    it('should return start for created status', () => {
      const action = getSessionPrimaryAction('created');
      expect(action).toBe('start');
    });

    it('should return continue for in_progress status', () => {
      const action = getSessionPrimaryAction('in_progress');
      expect(action).toBe('continue');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle hearing practice session navigation', () => {
      const sessionId = 'f3ba1fc2a97b44ff9ee25a7f';
      const url = getSessionUrl(sessionId, 'practice', 'analyzed');
      expect(url).toBe('/practice/session/f3ba1fc2a97b44ff9ee25a7f/results');
    });

    it('should handle exam completion flow', () => {
      const examId = 'exam-123';
      
      // User takes exam
      const takingUrl = getSessionUrl(examId, 'exam', 'in_progress');
      expect(takingUrl).toBe('/exam/exam-123');
      
      // Exam completed, view results
      const resultsUrl = getSessionUrl(examId, 'exam', 'completed');
      expect(resultsUrl).toBe('/exam/exam-123/results');
    });

    it('should handle practice session flow', () => {
      const sessionId = 'practice-456';
      
      // User starts practice
      const startUrl = getSessionUrl(sessionId, 'practice', 'created');
      expect(startUrl).toBe('/practice/session/practice-456');
      
      // User completes practice
      const analyzingUrl = getSessionUrl(sessionId, 'practice', 'completed');
      expect(analyzingUrl).toBe('/practice/session/practice-456/analyzing');
      
      // Analysis complete, view results
      const resultsUrl = getSessionUrl(sessionId, 'practice', 'analyzed');
      expect(resultsUrl).toBe('/practice/session/practice-456/results');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long session IDs', () => {
      const longId = 'a'.repeat(100);
      const url = getSessionUrl(longId, 'practice', 'analyzed');
      expect(url).toBe(`/practice/session/${longId}/results`);
    });

    it('should handle session IDs with special characters', () => {
      const specialId = 'session-123_test-v2';
      const url = getSessionUrl(specialId, 'exam', 'in_progress');
      expect(url).toBe(`/exam/${specialId}`);
    });
  });
});
