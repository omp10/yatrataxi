// Run: node src/modules/taxi/agent/services/agentCommission.test.js
import assert from 'node:assert/strict';
import { computeAgentCommissionAmount } from './agentCommissionService.js';

const pct = (value) => ({ enabled: true, type: 'percentage', value });

// scope commission tiers on a Rs 2500 seat
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: pct(8) }), 200);
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: pct(15) }), 375);

// fixed rules
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: { enabled: true, type: 'fixed', value: 150 } }), 150);

// never pays out more than the booking is worth
assert.equal(computeAgentCommissionAmount({ amount: 100, rule: pct(150) }), 100);
assert.equal(computeAgentCommissionAmount({ amount: 100, rule: { enabled: true, type: 'fixed', value: 500 } }), 100);

// disabled / zero / negative inputs credit nothing
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: { enabled: false, type: 'percentage', value: 10 } }), 0);
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: pct(0) }), 0);
assert.equal(computeAgentCommissionAmount({ amount: -500, rule: pct(10) }), 0);
assert.equal(computeAgentCommissionAmount({ amount: 2500, rule: undefined }), 0);

console.log('agent commission math ok');

// pooling and bus route to their own configurable rules, not the generic ride rules
import { AGENT_COMMISSION_KEYS } from './agentCommissionService.js';
assert.deepEqual(AGENT_COMMISSION_KEYS, ['directRide', 'referredRide', 'intercity', 'bus', 'pooling']);

console.log('agent commission keys ok');
