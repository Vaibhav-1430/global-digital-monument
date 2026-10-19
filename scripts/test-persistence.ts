import { randomUUID, randomBytes } from 'crypto';
import { getServiceSupabaseClient } from '../src/lib/db/supabase';

// Safely load .env.local without exposing variables to process logging
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // If .env.local is missing or preloaded by runtime, continue
  }
}

interface VerificationSummary {
  stage: string;
  success: boolean;
  details?: string;
}

const stages: VerificationSummary[] = [];

function recordStage(stage: string, success: boolean, details?: string) {
  stages.push({ stage, success, details });
  const symbol = success ? '✔' : '✖';
  console.log(`${symbol} [${stage}] ${details || (success ? 'Passed' : 'Failed')}`);
}

async function runPersistenceVerification() {
  console.log('================================================================');
  console.log('GLOBAL DIGITAL MONUMENT — PHASE 6A PERSISTENCE VERIFICATION');
  console.log('================================================================');

  let testRecordId: string | null = null;
  let supabase: ReturnType<typeof getServiceSupabaseClient> = null;
  let executionError: Error | null = null;
  let cleanupError: Error | null = null;

  try {
    // -------------------------------------------------------------------------
    // STAGE 1: Service-Role Client Initialization
    // -------------------------------------------------------------------------
    supabase = getServiceSupabaseClient();
    if (!supabase) {
      throw new Error('Service-role Supabase client could not be initialized. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }
    recordStage('CLIENT_INIT', true, 'Service-role client initialized successfully (secrets securely handled).');

    // -------------------------------------------------------------------------
    // STAGE 2: Insert Pending Test Record
    // -------------------------------------------------------------------------
    testRecordId = randomUUID();
    const uniqueRef = `test_order_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const testTimestamp = new Date().toISOString();
    const testRecord = {
      id: testRecordId,
      amount: 50.00,
      currency: 'INR' as const,
      status: 'pending' as const,
      is_anonymous: false,
      contributor_name: `Verification Light ${Date.now().toString().slice(-6)}`,
      message: 'Automated Phase 6A persistence verification beacon',
      photo_url: null,
      latitude: 28.613900,
      longitude: 77.209000,
      is_approximate: false,
      city: 'New Delhi',
      country: 'India',
      is_demo: true,
      payment_provider: 'razorpay' as const,
      payment_reference: uniqueRef,
      client_secret: null,
      donor_email: null,
      created_at: testTimestamp,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('contributions')
      .insert([testRecord])
      .select('id, amount, status, is_demo, payment_reference')
      .single();

    if (insertError || !insertedData) {
      throw new Error(`Insert failed: ${insertError?.message || 'No data returned'}`);
    }

    if (insertedData.id !== testRecordId || insertedData.status !== 'pending' || !insertedData.is_demo) {
      throw new Error(`Inserted record validation mismatch: id=${insertedData.id}, status=${insertedData.status}`);
    }

    recordStage('INSERT_PENDING', true, `Record inserted with status='pending' and is_demo=true (UUID: ${testRecordId}).`);

    // -------------------------------------------------------------------------
    // STAGE 3: Pending View Exclusion Check
    // -------------------------------------------------------------------------
    const { data: pendingViewData, error: pendingViewError } = await supabase
      .from('public_contributions')
      .select('id')
      .eq('id', testRecordId);

    if (pendingViewError) {
      throw new Error(`Pending view query error: ${pendingViewError.message}`);
    }

    if (pendingViewData && pendingViewData.length > 0) {
      throw new Error(`Security violation: Pending record ${testRecordId} is visible in public_contributions view.`);
    }

    recordStage('PENDING_VIEW_EXCLUSION', true, 'Confirmed pending record is completely excluded from public.public_contributions.');

    // -------------------------------------------------------------------------
    // STAGE 4: Update Record to Confirmed
    // -------------------------------------------------------------------------
    const confirmedAtTimestamp = new Date().toISOString();
    const { data: updatedData, error: updateError } = await supabase
      .from('contributions')
      .update({
        status: 'confirmed',
        confirmed_at: confirmedAtTimestamp,
      })
      .eq('id', testRecordId)
      .select('id, status, confirmed_at')
      .single();

    if (updateError || !updatedData) {
      throw new Error(`Update failed: ${updateError?.message || 'No data returned'}`);
    }

    if (updatedData.status !== 'confirmed' || !updatedData.confirmed_at) {
      throw new Error(`Update validation mismatch: status=${updatedData.status}, confirmed_at=${updatedData.confirmed_at}`);
    }

    recordStage('UPDATE_CONFIRMED', true, `Record transitioned to status='confirmed' at ${confirmedAtTimestamp}.`);

    // -------------------------------------------------------------------------
    // STAGE 5: Confirmed View Retrieval & Field Verification
    // -------------------------------------------------------------------------
    const { data: confirmedViewData, error: confirmedViewError } = await supabase
      .from('public_contributions')
      .select('*')
      .eq('id', testRecordId)
      .single();

    if (confirmedViewError || !confirmedViewData) {
      throw new Error(`Confirmed view retrieval error: ${confirmedViewError?.message || 'Record not found in view'}`);
    }

    // Verify all mapped fields match expected schema values
    if (confirmedViewData.id !== testRecordId) {
      throw new Error(`View ID mismatch: expected ${testRecordId}, got ${confirmedViewData.id}`);
    }
    if (Number(confirmedViewData.amount) !== testRecord.amount) {
      throw new Error(`View amount mismatch: expected ${testRecord.amount}, got ${confirmedViewData.amount}`);
    }
    if (confirmedViewData.currency !== testRecord.currency) {
      throw new Error(`View currency mismatch: expected ${testRecord.currency}, got ${confirmedViewData.currency}`);
    }
    if (confirmedViewData.contributor_name !== testRecord.contributor_name) {
      throw new Error(`View contributor_name mismatch: expected ${testRecord.contributor_name}, got ${confirmedViewData.contributor_name}`);
    }
    if (confirmedViewData.city !== testRecord.city || confirmedViewData.country !== testRecord.country) {
      throw new Error('View location metadata mismatch.');
    }
    if (!confirmedViewData.is_demo) {
      throw new Error('View is_demo flag mismatch: expected true.');
    }
    if (!confirmedViewData.confirmed_at) {
      throw new Error('View confirmed_at timestamp is null.');
    }

    recordStage('CONFIRMED_VIEW_RETRIEVAL', true, 'Confirmed record retrieved via public.public_contributions with correct values.');

  } catch (err: any) {
    executionError = err;
    recordStage('EXECUTION_FAILURE', false, err?.message || 'Unexpected failure during verification.');
  } finally {
    // -------------------------------------------------------------------------
    // STAGE 6: Targeted Cleanup & Post-Cleanup Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup Stage ---');
    if (testRecordId && supabase) {
      try {
        const { error: deleteError } = await supabase
          .from('contributions')
          .delete()
          .eq('id', testRecordId);

        if (deleteError) {
          throw new Error(`Cleanup deletion failed: ${deleteError.message}`);
        }

        // Verify base table exclusion
        const { data: baseCheck, error: baseCheckError } = await supabase
          .from('contributions')
          .select('id')
          .eq('id', testRecordId);

        if (baseCheckError) {
          throw new Error(`Base table check error after cleanup: ${baseCheckError.message}`);
        }
        if (baseCheck && baseCheck.length > 0) {
          throw new Error(`Test record ${testRecordId} still exists in public.contributions table.`);
        }

        // Verify public view exclusion
        const { data: viewCheck, error: viewCheckError } = await supabase
          .from('public_contributions')
          .select('id')
          .eq('id', testRecordId);

        if (viewCheckError) {
          throw new Error(`Public view check error after cleanup: ${viewCheckError.message}`);
        }
        if (viewCheck && viewCheck.length > 0) {
          throw new Error(`Test record ${testRecordId} still exists in public.public_contributions view.`);
        }

        recordStage('CLEANUP_AND_VERIFICATION', true, `Test record ${testRecordId} deleted and verified absent from table and view.`);
      } catch (err: any) {
        cleanupError = err;
        recordStage('CLEANUP_AND_VERIFICATION', false, err?.message || 'Cleanup error.');
      }
    } else {
      recordStage('CLEANUP_AND_VERIFICATION', true, 'No record ID was created; cleanup skipped safely.');
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL RESULT SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PERSISTENCE VERIFICATION SUMMARY');
  console.log('================================================================');
  const allStagesPassed = stages.every((s) => s.success);

  if (allStagesPassed && !executionError && !cleanupError) {
    console.log('ALL PERSISTENCE VERIFICATION CHECKS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    console.error('PERSISTENCE VERIFICATION FAILED.');
    if (executionError) console.error(`Execution error: ${executionError.message}`);
    if (cleanupError) console.error(`Cleanup error: ${cleanupError.message}`);
    process.exit(1);
  }
}

runPersistenceVerification();
