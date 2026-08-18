import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/ui/stats-card';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminApi } from '@/services/adminApi';

interface PricingPack {
  pack_name: string;
  price_euros: number;
  points_included: number;
  plan_type: string;
  llm_model: string;
  usage_example: string;
  description: string;
  popular: boolean;
  active: boolean;
}

interface CreditRule {
  session_type: string;
  activity_type: string;
  points_cost: number;
  active: boolean;
  level: string;
}

interface PricingPolicyData {
  pricing_packs: PricingPack[];
  credit_rules: Record<string, CreditRule[]>;
}

export const PricingPolicyPage: React.FC = () => {
  const { token } = useAdminAuth();
  const [data, setData] = useState<PricingPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricingPolicyData = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await adminApi.getPricingPolicy(token);
        
        if (response.success && response.data) {
          setData({
            pricing_packs: response.data.pricing_packs,
            credit_rules: response.data.credit_rules,
          });
        } else {
          setError(response.message || 'Failed to load pricing policy data');
        }
      } catch (err) {
        console.error('Error fetching pricing policy:', err);
        setError('Failed to load pricing policy data');
      } finally {
        setLoading(false);
      }
    };

    fetchPricingPolicyData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing and policy data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing & Credit Management</h1>
            <p className="text-gray-600">
              View pricing packages and credit rules
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Active Pricing Packs"
              value={data.pricing_packs?.filter(pack => pack.active).length || 0}
              trend="stable"
              icon="💳"
            />
            <StatsCard
              title="Credit Rule Levels"
              value={Object.keys(data.credit_rules || {}).length}
              trend="stable"
              icon="📚"
            />
            <StatsCard
              title="Total Credit Rules"
              value={Object.values(data.credit_rules || {}).flat().length}
              trend="stable"
              icon="🎯"
            />
          </div>

          {/* Pricing Packages Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing Packages</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(data.pricing_packs || []).map((pack, index) => (
                <div 
                  key={index}
                  className={`border-2 rounded-lg p-6 ${
                    pack.popular 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  } ${!pack.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{pack.pack_name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{pack.plan_type} Plan</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">€{pack.price_euros}</div>
                      <div className="text-sm text-gray-600">{pack.points_included} points</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{pack.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">LLM Model:</span>
                      <span className="font-medium">{pack.llm_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${pack.active ? 'text-green-600' : 'text-red-600'}`}>
                        {pack.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      <strong>Usage Example:</strong> {pack.usage_example}
                    </p>
                  </div>
                  
                  {pack.popular && (
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🌟 Popular Choice
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Credit Rules Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Credit Rules by Level</h2>
            <div className="space-y-6">
              {Object.entries(data.credit_rules || {}).map(([level, rules]) => (
                <div key={level} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Level {level}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Session Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Activity Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points Cost
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule, ruleIndex) => (
                          <tr key={ruleIndex}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                              {rule.session_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                              {rule.activity_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {rule.points_cost} points
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                rule.active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {rule.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>
  );
};
