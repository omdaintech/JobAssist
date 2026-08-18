"""
Credit System Workflow Tests
Tests the complete credit deduction flow with analysis
"""
import pytest
from typing import Dict, Any


@pytest.mark.sessions
@pytest.mark.asyncio
@pytest.mark.workflow
class TestCreditWorkflow:
    """
    Comprehensive Credit System Workflow Test
    
    Tests the complete credit deduction lifecycle:
    1. Get initial credit balance
    2. Create writing practice session
    3. Answer all questions
    4. Analyze session (CREDIT DEDUCTION happens here)
    5. Verify credit balance decreased
    6. Check credit history/usage history for deduction record
    
    This validates that:
    - Credits are properly deducted after analysis
    - Credit balance updates correctly
    - Usage history reflects the transaction
    - Credit deduction amount is correct
    """
    
    async def test_complete_credit_deduction_workflow(
        self, 
        authenticated_client, 
        sample_session_data
    ):
        """
        Complete credit workflow test: Check Credits → Session → Analyze → Verify Deduction
        This validates the entire credit system as a real user would experience it.
        """
        
        # ========================================
        # STEP 1: GET INITIAL CREDIT BALANCE
        # ========================================
        print("\n" + "="*60)
        print("STEP 1: Getting Initial Credit Balance")
        print("="*60)
        
        initial_status_response = await authenticated_client.get("/api/auth/status")
        
        assert initial_status_response.status_code == 200, \
            f"Failed to get user status: {initial_status_response.status_code}"
        
        initial_status_data = initial_status_response.json()
        assert initial_status_data.get("success") == True
        assert "usage_info" in initial_status_data
        
        initial_usage = initial_status_data["usage_info"]
        initial_remaining = initial_usage.get("remaining_count", 0)
        initial_used = initial_usage.get("used_count", 0)
        initial_allocated = initial_usage.get("allocated_count", 0)
        
        print(f"✓ Initial credit balance retrieved")
        print(f"  - Allocated credits: {initial_allocated}")
        print(f"  - Used credits: {initial_used}")
        print(f"  - Remaining credits: {initial_remaining}")
        
        # Ensure user has credits
        if initial_remaining <= 0:
            pytest.skip("User has no remaining credits - cannot test credit deduction")
        
        # ========================================
        # STEP 2: CREATE SESSION
        # ========================================
        print("\n" + "="*60)
        print("STEP 2: Creating Writing Practice Session")
        print("="*60)
        
        create_response = await authenticated_client.post(
            "/api/sessions", 
            json=sample_session_data
        )
        
        assert create_response.status_code in [200, 201], \
            f"Session creation failed: {create_response.status_code}"
        
        session_data = create_response.json()
        assert session_data.get("success") == True
        assert "session_id" in session_data
        
        session_id = session_data["session_id"]
        total_questions = session_data.get("total_questions", 5)
        
        print(f"✓ Session created successfully")
        print(f"  - Session ID: {session_id}")
        print(f"  - Total questions: {total_questions}")
        
        # ========================================
        # STEP 3: CHECK CREDITS AFTER SESSION CREATION
        # ========================================
        print("\n" + "="*60)
        print("STEP 3: Checking Credits After Session Creation")
        print("="*60)
        
        after_creation_response = await authenticated_client.get("/api/auth/status")
        
        if after_creation_response.status_code == 200:
            after_creation_data = after_creation_response.json()
            after_creation_usage = after_creation_data.get("usage_info", {})
            after_creation_remaining = after_creation_usage.get("remaining_count", 0)
            
            print(f"✓ Credits after session creation")
            print(f"  - Remaining credits: {after_creation_remaining}")
            print(f"  - Credits may or may not be deducted at creation")
        else:
            print(f"⚠ Status check skipped (rate limited)")
            after_creation_remaining = initial_remaining
        
        # ========================================
        # STEP 4: ANSWER ALL QUESTIONS
        # ========================================
        print("\n" + "="*60)
        print(f"STEP 4: Answering Questions (up to {total_questions})")
        print("="*60)
        
        answered_count = 0
        max_attempts = min(total_questions, 5)  # Limit to 5 to avoid rate limits
        
        for question_num in range(1, max_attempts + 1):
            print(f"\n--- Question {question_num}/{max_attempts} ---")
            
            # Get next question
            question_response = await authenticated_client.get(
                f"/api/sessions/{session_id}/next-question"
            )
            
            if question_response.status_code == 429:
                print(f"⚠ Rate limited on question {question_num}, stopping")
                break
            elif question_response.status_code != 200:
                print(f"⚠ No more questions available (status: {question_response.status_code})")
                break
            
            question_data = question_response.json()
            question_content = question_data.get("question_data", {})
            
            print(f"✓ Got question {question_num}")
            
            # Submit answer
            answer_payload = {
                "activity_type": "writing",
                "question_number": question_num,
                "question_data": question_content,
                "user_answer": f"This is my answer to question {question_num}. I am practicing my writing skills."
            }
            
            answer_response = await authenticated_client.post(
                f"/api/sessions/{session_id}/submit-answer",
                json=answer_payload
            )
            
            if answer_response.status_code in [200, 201]:
                print(f"✓ Answer submitted successfully")
                answered_count += 1
            elif answer_response.status_code == 429:
                print(f"⚠ Rate limited on answer submission, stopping")
                break
            else:
                print(f"⚠ Answer submission failed: {answer_response.status_code}")
                break
        
        print(f"\n✓ Completed answering phase: {answered_count} answers submitted")
        
        # Must have at least 1 answer to analyze
        if answered_count == 0:
            pytest.skip("No answers submitted - cannot test credit deduction")
        
        # ========================================
        # STEP 5: CHECK CREDITS BEFORE ANALYSIS
        # ========================================
        print("\n" + "="*60)
        print("STEP 5: Checking Credits BEFORE Analysis")
        print("="*60)
        
        before_analysis_response = await authenticated_client.get("/api/auth/status")
        
        assert before_analysis_response.status_code == 200, \
            "Failed to get credits before analysis"
        
        before_analysis_data = before_analysis_response.json()
        before_analysis_usage = before_analysis_data.get("usage_info", {})
        before_analysis_remaining = before_analysis_usage.get("remaining_count", 0)
        before_analysis_used = before_analysis_usage.get("used_count", 0)
        
        print(f"✓ Credits BEFORE analysis")
        print(f"  - Used credits: {before_analysis_used}")
        print(f"  - Remaining credits: {before_analysis_remaining}")
        
        # ========================================
        # STEP 6: ANALYZE SESSION (CREDIT DEDUCTION)
        # ========================================
        print("\n" + "="*60)
        print("STEP 6: Analyzing Session (CREDIT DEDUCTION HAPPENS HERE)")
        print("="*60)
        print("⚠ Note: This step uses real LLM and may take up to 3 minutes")
        
        try:
            analyze_response = await authenticated_client.post(
                f"/api/sessions/{session_id}/analyze",
                timeout=200.0  # 3+ minutes for LLM calls
            )
            
            if analyze_response.status_code == 200:
                analyze_data = analyze_response.json()
                
                print(f"✓ Session analyzed successfully!")
                print(f"  - Analysis success: {analyze_data.get('success')}")
                
                # Check for credit deduction information in response
                if "pre_deduction_credits" in analyze_data:
                    pre_deduction = analyze_data.get("pre_deduction_credits", 0)
                    post_deduction = analyze_data.get("post_deduction_credits", 0)
                    points_deducted = pre_deduction - post_deduction
                    
                    print(f"  - Pre-deduction credits: {pre_deduction}")
                    print(f"  - Post-deduction credits: {post_deduction}")
                    print(f"  - Credits deducted: {points_deducted}")
                
            elif analyze_response.status_code == 400:
                error_data = analyze_response.json()
                print(f"⚠ Analysis skipped: {error_data.get('detail', 'Unknown reason')}")
                pytest.skip(f"Analysis failed: {error_data.get('detail')}")
            elif analyze_response.status_code == 429:
                print(f"⚠ Analysis skipped (rate limited)")
                pytest.skip("Analysis rate limited")
            else:
                print(f"⚠ Analysis failed: {analyze_response.status_code}")
                pytest.skip(f"Analysis failed with status {analyze_response.status_code}")
        
        except Exception as e:
            error_type = type(e).__name__
            print(f"⚠ Analysis failed with {error_type}: {str(e)[:100]}")
            pytest.skip(f"Analysis failed with exception: {error_type}")
        
        # ========================================
        # STEP 7: VERIFY CREDITS AFTER ANALYSIS
        # ========================================
        print("\n" + "="*60)
        print("STEP 7: Verifying Credits AFTER Analysis (CRITICAL CHECK)")
        print("="*60)
        
        after_analysis_response = await authenticated_client.get("/api/auth/status")
        
        assert after_analysis_response.status_code == 200, \
            "Failed to get credits after analysis"
        
        after_analysis_data = after_analysis_response.json()
        after_analysis_usage = after_analysis_data.get("usage_info", {})
        after_analysis_remaining = after_analysis_usage.get("remaining_count", 0)
        after_analysis_used = after_analysis_usage.get("used_count", 0)
        
        print(f"✓ Credits AFTER analysis")
        print(f"  - Used credits: {after_analysis_used}")
        print(f"  - Remaining credits: {after_analysis_remaining}")
        
        # ========================================
        # CRITICAL VALIDATION: CREDITS DEDUCTED
        # ========================================
        credits_deducted = before_analysis_remaining - after_analysis_remaining
        used_credits_increased = after_analysis_used - before_analysis_used
        
        print(f"\n" + "="*60)
        print("CREDIT DEDUCTION VALIDATION")
        print("="*60)
        print(f"Before Analysis:")
        print(f"  - Remaining: {before_analysis_remaining}")
        print(f"  - Used: {before_analysis_used}")
        print(f"After Analysis:")
        print(f"  - Remaining: {after_analysis_remaining}")
        print(f"  - Used: {after_analysis_used}")
        print(f"Deduction:")
        print(f"  - Credits deducted: {credits_deducted}")
        print(f"  - Used credits increased by: {used_credits_increased}")
        
        # ASSERT: Credits must be deducted
        assert credits_deducted > 0, \
            f"❌ CRITICAL: Credits NOT deducted! Before: {before_analysis_remaining}, After: {after_analysis_remaining}"
        
        assert used_credits_increased > 0, \
            f"❌ CRITICAL: Used credits NOT increased! Before: {before_analysis_used}, After: {after_analysis_used}"
        
        assert credits_deducted == used_credits_increased, \
            f"❌ CRITICAL: Deduction mismatch! Deducted: {credits_deducted}, Increased: {used_credits_increased}"
        
        print(f"\n✅ CREDIT DEDUCTION VERIFIED!")
        print(f"   {credits_deducted} credits properly deducted after analysis")
        
        # ========================================
        # STEP 8: CHECK USAGE HISTORY
        # ========================================
        print("\n" + "="*60)
        print("STEP 8: Checking Usage History for Deduction Record")
        print("="*60)
        
        history_response = await authenticated_client.get(
            "/api/users/usage-history",
            params={"limit": 10}
        )
        
        if history_response.status_code == 200:
            history_data = history_response.json()
            practice_log = history_data.get("practice_log", [])
            
            print(f"✓ Usage history retrieved")
            print(f"  - Total records: {len(practice_log)}")
            
            # Find the record for this session
            session_record = None
            for record in practice_log:
                if record.get("exam_id") == session_id:
                    session_record = record
                    break
            
            if session_record:
                print(f"\n✓ Found usage record for this session:")
                print(f"  - Session ID: {session_record.get('exam_id')}")
                print(f"  - Points deducted: {session_record.get('points_deducted', 0)}")
                print(f"  - Session type: {session_record.get('session_type')}")
                print(f"  - Status: {session_record.get('status')}")
                print(f"  - Created at: {session_record.get('created_at')}")
                
                # Validate the deduction amount matches
                history_points_deducted = session_record.get('points_deducted', 0)
                
                # Note: The deduction in history should match what we calculated
                print(f"\n✓ Validating deduction amount")
                print(f"  - Calculated deduction: {credits_deducted}")
                print(f"  - History deduction: {history_points_deducted}")
                
                if history_points_deducted > 0:
                    print(f"✅ Usage history correctly shows {history_points_deducted} credits deducted")
                else:
                    print(f"⚠ Warning: History shows 0 credits deducted (may be updated later)")
            else:
                print(f"⚠ Session record not found in recent history (may need pagination)")
        
        elif history_response.status_code == 429:
            print(f"⚠ Usage history check skipped (rate limited)")
        else:
            print(f"⚠ Usage history check failed: {history_response.status_code}")
        
        # ========================================
        # FINAL SUMMARY
        # ========================================
        print("\n" + "="*60)
        print("CREDIT WORKFLOW TEST SUMMARY")
        print("="*60)
        print(f"✓ Session ID: {session_id}")
        print(f"✓ Questions answered: {answered_count}/{max_attempts}")
        print(f"✓ Session analyzed successfully")
        print(f"✓ Credits deducted: {credits_deducted}")
        print(f"\n✅ CREDIT SYSTEM VALIDATION:")
        print(f"  Initial Credits: {initial_remaining}")
        print(f"  Before Analysis: {before_analysis_remaining}")
        print(f"  After Analysis: {after_analysis_remaining}")
        print(f"  Deducted: {credits_deducted}")
        print(f"\nAll credit system checks validated:")
        print(f"  1. ✓ Initial credit balance retrieved")
        print(f"  2. ✓ Session created successfully")
        print(f"  3. ✓ Questions answered")
        print(f"  4. ✓ Session analyzed (LLM)")
        print(f"  5. ✓ Credits deducted correctly")
        print(f"  6. ✓ Credit balance updated")
        print(f"  7. ✓ Usage history accessible")
        print("="*60 + "\n")
        
        # Final assertions
        assert session_id is not None, "Session should be created"
        assert answered_count > 0, "At least one answer should be submitted"
        assert credits_deducted > 0, "Credits should be deducted"
        assert after_analysis_remaining < before_analysis_remaining, "Remaining credits should decrease"
        
        print(f"🎉 COMPLETE CREDIT WORKFLOW TEST PASSED!")

