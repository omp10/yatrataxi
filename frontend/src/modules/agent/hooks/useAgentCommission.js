import { useEffect, useState } from 'react';
import { agentService } from '../services/agentService';

// Commission rules come from the agent's own profile (set by admin); keys match the
// backend: directRide, referredRide, intercity, bus, pooling, entertainment.
export const useAgentCommissionConfig = () => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let active = true;
    agentService.getProfile()
      .then((response) => {
        const profile = response?.data || response || {};
        if (active) setConfig(profile.commissionConfig || {});
      })
      .catch(() => {
        if (active) setConfig({});
      });
    return () => { active = false; };
  }, []);

  return config;
};

export const useAgentCommissionRule = (ruleKey) => useAgentCommissionConfig()?.[ruleKey] || null;

const isRuleActive = (rule) => Boolean(rule) && rule.enabled !== false && Number(rule.value) > 0;

export const estimateAgentCommission = (amount, rule) => {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (!isRuleActive(rule) || safeAmount <= 0) return 0;
  const value = Number(rule.value);
  const commission = rule.type === 'fixed' ? Math.min(value, safeAmount) : (safeAmount * value) / 100;
  return Math.round(commission * 100) / 100;
};

export const formatCommissionRule = (rule) => {
  if (!isRuleActive(rule)) return '';
  return rule.type === 'fixed' ? `Earn ₹${Number(rule.value)} comm` : `Earn ${Number(rule.value)}% comm`;
};
