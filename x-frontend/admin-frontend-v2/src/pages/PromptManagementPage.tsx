import React, { useCallback, useEffect, useState } from "react";
import { AdminErrorDisplay } from "../components/ui/admin-error-display";
import { AdminLoadingState } from "../components/ui/admin-loading-state";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useLanguages } from "../hooks/useLanguages";
import { adminApi } from "../services/adminApi";

interface PromptFile {
  name: string;
  display_name: string;
  type: string;
  exists: boolean;
  file_path: string;
}

interface ActivityGroup {
  [activity: string]: PromptFile[];
}

interface LevelGroup {
  level: string;
  activities: ActivityGroup;
}

interface PromptData {
  success: boolean;
  language_info: any;
  prompts: LevelGroup[];
}

interface PromptContent {
  content: string;
  variables: string[];
  variable_values: { [key: string]: string };
  file_stats: {
    file_path: string;
    line_count: number;
    word_count: number;
    character_count: number;
  };
  level: string;
  activity: string;
  prompt_type: string;
}

const PromptManagementPage: React.FC = () => {
  const { token } = useAdminAuth();
  const { languages, loading: languagesLoading } = useLanguages();

  // Filter states
  const [selectedLanguage, setSelectedLanguage] = useState("");

  // Data states
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedPrompt, setSelectedPrompt] = useState<PromptContent | null>(null);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<{name: string, value: string} | null>(null);
  const [showVariableDetailModal, setShowVariableDetailModal] = useState(false);

  const loadPrompts = useCallback(async () => {
    if (!selectedLanguage || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.listPrompts(token, selectedLanguage);

      if (response.success && response.data) {
        setPromptData(response.data);
      } else {
        setError('Failed to load prompt data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage, token]);

  // Auto-load prompts when language is selected
  useEffect(() => {
    if (!selectedLanguage) {
      setPromptData(null);
      return;
    }

    if (token) {
      void loadPrompts();
    }
  }, [selectedLanguage, token, loadPrompts]);

  // Reset selection if currently chosen language is no longer available
  useEffect(() => {
    if (!selectedLanguage) {
      return;
    }

    const stillAvailable = languages?.some(lang => lang.language_id === selectedLanguage);
    if (!stillAvailable) {
      setSelectedLanguage('');
      setPromptData(null);
    }
  }, [languages, selectedLanguage]);

  const loadPromptContent = async (
    level: string,
    activity: string,
    promptType: string,
    displayName: string
  ) => {
    if (!selectedLanguage || !token) return;

    setLoadingContent(true);
    setError(null);

    try {
      const response = await adminApi.getRawPromptContent(
        token,
        selectedLanguage,
        level,
        activity,
        promptType
      );

      if (response.success && response.data) {
        // Transform the API response to match the expected frontend structure
        const transformedData = {
          content: response.data.prompt_content,
          variables: response.data.variables || [],
          variable_values: response.data.variable_values || {},
          file_stats: response.data.file_stats || {
            file_path: '',
            line_count: 0,
            word_count: 0,
            character_count: 0
          },
          level: response.data.metadata?.level || level,
          activity: response.data.metadata?.activity_type || activity,
          prompt_type: response.data.metadata?.prompt_type || promptType
        };

        setSelectedPrompt(transformedData);
        setShowVariablesModal(true);
      } else {
        setError('Failed to load prompt content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt content');
    } finally {
      setLoadingContent(false);
    }
  };

  const showVariableDetail = (variableName: string, variableValue: string) => {
    setSelectedVariable({ name: variableName, value: variableValue });
    setShowVariableDetailModal(true);
  };

  const getPromptTypeLabel = (type: string): string => {
    switch (type) {
      case 'feedback':
        return 'Practice Feedback';
      case 'bulk_question':
        return 'Bulk Question Generation';
      case 'batch_analysis':
        return 'Batch Analysis';
      default:
        return type;
    }
  };

  const getExistenceIcon = (exists: boolean): string => {
    return exists ? '✅' : '❌';
  };

  const formatActivityName = (activity: string): string => {
    if (!activity) return 'Unknown';
    return activity.charAt(0).toUpperCase() + activity.slice(1);
  };

  if (languagesLoading) {
    return <AdminLoadingState message="Loading languages..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Language Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Prompt Management
        </h1>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={languagesLoading || (languages?.length ?? 0) === 0}
          >
            <option value="">Select Language</option>
            {languages?.map((lang) => (
              <option key={lang.language_id} value={lang.language_id}>
                {lang.language_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && <AdminErrorDisplay message={error} />}

      {/* Loading State */}
      {loading && <AdminLoadingState message="Loading prompts..." />}

      {/* No language selected */}
      {!selectedLanguage && !loading && !error && (
        <div className="bg-white p-6 rounded-lg shadow text-gray-600">
          Choose a language above to load its prompt templates. Languages are always retrieved from the API—no defaults.
        </div>
      )}

      {/* Prompt Structure Display */}
      {promptData && !loading && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Prompts - {promptData.language_info?.language_name}
          </h2>

          <div className="space-y-6">
            {promptData.prompts.map((levelGroup) => (
              <div key={levelGroup.level} className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  📁 Level {levelGroup.level}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(levelGroup.activities).map(([activity, files]) => (
                    <div key={activity} className="border rounded p-3 bg-gray-50">
                      <h4 className="font-medium text-gray-700 mb-2">
                        📂 {formatActivityName(activity)}
                      </h4>

                      <div className="space-y-2">
                        {files.map((file) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="flex items-center gap-2">
                              {getExistenceIcon(file.exists)}
                              <button
                                onClick={() => file.exists ? loadPromptContent(
                                  levelGroup.level,
                                  activity,
                                  file.type,
                                  file.display_name
                                ) : undefined}
                                disabled={!file.exists || loadingContent}
                                className={`text-left ${
                                  file.exists
                                    ? 'text-blue-600 hover:text-blue-800 cursor-pointer'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {getPromptTypeLabel(file.type)}
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variables Modal */}
      {showVariablesModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Prompt Content - {formatActivityName(selectedPrompt.activity)} / {getPromptTypeLabel(selectedPrompt.prompt_type)}
              </h3>
              <button
                onClick={() => setShowVariablesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* File Stats */}
            <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
              <p><strong>File:</strong> ~{selectedPrompt.file_stats.file_path.replace('app/llm/prompts/', '')}</p>
              <p><strong>Stats:</strong> {selectedPrompt.file_stats.line_count} lines, {selectedPrompt.file_stats.word_count} words, {selectedPrompt.file_stats.character_count} characters, ~{Math.round(selectedPrompt.file_stats.character_count / 4)} tokens</p>
            </div>

            {/* Variables */}
            {selectedPrompt.variables.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Template Variables:</h4>
                <div className="bg-yellow-50 p-3 rounded">
                  {selectedPrompt.variables.map((variable) => (
                    <div key={variable} className="mb-2">
                      <button
                        onClick={() => showVariableDetail(variable, selectedPrompt.variable_values[variable])}
                        className="font-mono text-sm bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300 cursor-pointer transition-colors"
                      >
                        {`{{${variable}}}`}
                      </button>
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedPrompt.variable_values[variable].length > 100
                          ? `${selectedPrompt.variable_values[variable].substring(0, 100)}...`
                          : selectedPrompt.variable_values[variable]
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Content */}
            <div>
              <h4 className="font-medium mb-2">Template Content:</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {selectedPrompt.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Variable Detail Modal */}
      {showVariableDetailModal && selectedVariable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Template Variable: <code className="bg-gray-100 px-2 py-1 rounded">{`{{${selectedVariable.name}}}`}</code>
              </h3>
              <button
                onClick={() => setShowVariableDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Variable Name:</h4>
                <code className="bg-gray-100 p-2 rounded block">{selectedVariable.name}</code>
              </div>

              <div>
                <h4 className="font-medium mb-2">Full Value:</h4>
                <div className="bg-gray-100 p-4 rounded text-sm max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{selectedVariable.value}</pre>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Length: {selectedVariable.value.length} characters
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptManagementPage;
