"""
LangChain-based prompt manager
Single source of truth for ALL prompt loading and management
Supports multiple languages and all prompt types dynamically
"""

from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List
import os
import structlog
from app.config import settings, language_helper

logger = structlog.get_logger()


class PromptManager:
    """
    Unified prompt manager - Single Source of Truth for ALL prompts
    Supports multiple languages and all prompt types:
    - question: Standard question generation prompts
    - bulk_question: Admin bulk generation prompts
    - feedback: Practice feedback prompts
    - batch_analysis: Exam batch analysis prompts
    """

    def __init__(self, prompts_base_dir: str = "app/llm/prompts"):
        self.prompts_base_dir = prompts_base_dir
        self.templates = self._load_all_prompt_types()

    def _load_all_prompt_types(self) -> Dict[str, ChatPromptTemplate]:
        """Load ALL prompt types as LangChain templates for all supported languages"""
        templates = {}

        levels = ["A1", "A2", "B1", "B2"]
        activities = ["reading", "writing", "grammar", "hearing", "speaking"]

        # ALL prompt types supported by the system
        prompt_types = [
            {"type": "question", "suffix": ".txt"},  # Legacy: reading.txt
            {
                "type": "bulk_question",
                "suffix": "_bulk_question.txt",
            },  # reading_bulk_question.txt
            {"type": "feedback", "suffix": "_feedback.txt"},  # reading_feedback.txt
            {
                "type": "batch_analysis",
                "suffix": "_batch_analysis.txt",
            },  # reading_batch_analysis.txt
        ]

        # Load templates from available language directories
        supported_languages = self._get_supported_languages()

        for language in supported_languages:
            language_templates = {}

            for level in levels:
                for activity in activities:
                    for prompt_type in prompt_types:
                        # Create template key: {language_id}_reading_A1_bulk_question
                        template_key = (
                            f"{language}_{activity}_{level}_{prompt_type['type']}"
                        )

                        template = self._load_single_template(
                            language, level, activity, prompt_type
                        )
                        if template:
                            language_templates[template_key] = template

            # Add language-specific templates to main dict
            templates.update(language_templates)

            if language_templates:
                logger.info(
                    f"Loaded {len(language_templates)} prompt templates for {language}"
                )
            else:
                logger.warning(f"No prompt templates found for {language}")

        logger.info(f"Total prompt templates loaded: {len(templates)}")
        return templates

    def _get_supported_languages(self) -> List[str]:
        """Get list of supported languages from prompt directory structure"""
        supported_languages = []

        # Scan prompts directory for language subdirectories
        if os.path.exists(self.prompts_base_dir):
            for item in os.listdir(self.prompts_base_dir):
                item_path = os.path.join(self.prompts_base_dir, item)
                if os.path.isdir(item_path) and not item.startswith("."):
                    supported_languages.append(item)

        # STRICT: No fallback - language directories must exist
        if not supported_languages:
            logger.error(
                "No language directories found in prompts/ - check prompt file structure"
            )
            raise FileNotFoundError("No language prompt directories found")

        logger.info(f"Detected supported languages: {supported_languages}")
        return supported_languages

    def _load_single_template(
        self, language: str, level: str, activity: str, prompt_type: dict
    ) -> Optional[ChatPromptTemplate]:
        """Load a single prompt template for a specific combination"""
        try:
            # Construct file path based on prompt type
            if prompt_type["type"] == "question":
                # Legacy format: reading.txt
                filename = f"{activity}{prompt_type['suffix']}"
            else:
                # Modern format: reading_bulk_question.txt
                filename = f"{activity}{prompt_type['suffix']}"

            file_path = os.path.join(self.prompts_base_dir, language, level, filename)

            if not os.path.exists(file_path):
                logger.debug(f"Prompt file not found: {file_path}")
                return None

            # Read prompt content
            with open(file_path, "r", encoding="utf-8") as f:
                system_prompt = f.read().strip()

            if not system_prompt:
                logger.warning(f"Empty prompt file: {file_path}")
                return None

            # SPECIAL HANDLING: bulk_question prompts use custom {{placeholders}}
            # Don't parse them as LangChain templates - store as raw text
            if prompt_type["type"] == "bulk_question":
                # Create a simple wrapper that stores raw content
                # We'll return the raw content in get_prompt_content method
                template = ChatPromptTemplate.from_messages(
                    [
                        ("system", "BULK_QUESTION_RAW_CONTENT"),
                        ("human", "{user_request}"),
                    ]
                )
                # Store the raw content as an attribute for later retrieval
                template._raw_bulk_content = system_prompt
                return template
            else:
                # Regular LangChain template for question, feedback, batch_analysis
                template = ChatPromptTemplate.from_messages(
                    [("system", system_prompt), ("human", "{user_request}")]
                )
                return template

        except Exception as e:
            logger.error(
                f"Failed to load template {language}/{level}/{activity}/{prompt_type['type']}: {str(e)}"
            )
            return None

    # ===============================
    # UNIFIED PROMPT ACCESS METHODS
    # ===============================

    def get_prompt_template(
        self,
        activity_type: str,
        level: str,
        prompt_type: str = "question",
        language: Optional[str] = None,
        language_id: Optional[str] = None,
    ) -> Optional[ChatPromptTemplate]:
        """
        UNIFIED method to get ANY prompt template

        Args:
            activity_type: reading, writing, grammar
            level: A1, A2, B1
            prompt_type: question, bulk_question, feedback, batch_analysis
            language: Language identifier (optional, defaults to system default)
            language_id: Language ID (optional, preferred over language parameter)

        Returns:
            ChatPromptTemplate or None if not found
        """
        # Determine language identifier for template key
        if language_id:
            # Use language_id directly for template key (directories now use language IDs)
            language_identifier = language_id
        elif language:
            # Use language directly as identifier
            language_identifier = language
        else:
            # Default to system default language (for backward compatibility)
            language_identifier = settings.default_language

        template_key = f"{language_identifier}_{activity_type}_{level}_{prompt_type}"
        template = self.templates.get(template_key)

        if not template:
            logger.error(
                f"No {prompt_type} template found for {language_identifier}/{activity_type}/{level}"
            )
            return None

        return template

    def get_prompt_content(
        self,
        activity_type: str,
        level: str,
        prompt_type: str = "question",
        language: Optional[str] = None,
        language_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Get raw prompt content as string

        Args:
            activity_type: reading, writing, grammar
            level: A1, A2, B1
            prompt_type: question, bulk_question, feedback, batch_analysis
            language: Language identifier (optional)

        Returns:
            Raw prompt content as string or None
        """
        template = self.get_prompt_template(activity_type, level, prompt_type, language, language_id)
        if not template:
            return None

        # SPECIAL HANDLING: bulk_question prompts store raw content
        if prompt_type == "bulk_question" and hasattr(template, "_raw_bulk_content"):
            return template._raw_bulk_content

        # Regular LangChain template extraction for other prompt types
        if template.messages and hasattr(template.messages[0], "prompt"):
            return template.messages[0].prompt.template
        return None

    def prompt_exists(
        self,
        activity_type: str,
        level: str,
        prompt_type: str = "question",
        language: Optional[str] = None,
        language_id: Optional[str] = None,
    ) -> bool:
        """Check if a specific prompt exists"""
        # Determine language identifier for template key
        if language_id:
            # Use language_id directly for template key
            language_identifier = language_id
        elif language:
            # Use language directly as identifier (assume it's already an ID)
            language_identifier = language
        else:
            # Default to system default language (for backward compatibility)
            language_identifier = settings.default_language

        template_key = f"{language_identifier}_{activity_type}_{level}_{prompt_type}"
        return template_key in self.templates

    # ===============================
    # LEGACY COMPATIBILITY METHODS
    # ===============================

    def get_question_template(
        self, activity_type: str, level: str, language: Optional[str] = None, language_id: Optional[str] = None
    ) -> Optional[ChatPromptTemplate]:
        """Legacy method - redirects to unified method"""
        return self.get_prompt_template(activity_type, level, "question", language, language_id)

    def get_feedback_template(
        self, activity_type: str, level: str, language: Optional[str] = None, language_id: Optional[str] = None
    ) -> Optional[ChatPromptTemplate]:
        """Legacy method - redirects to unified method"""
        return self.get_prompt_template(activity_type, level, "feedback", language, language_id)

    def get_question_system_prompt(
        self, activity_type: str, level: str, language: Optional[str] = None, language_id: Optional[str] = None
    ) -> Optional[str]:
        """Legacy method - redirects to unified method"""
        return self.get_prompt_content(activity_type, level, "question", language, language_id)

    def get_feedback_system_prompt(
        self, activity_type: str, level: str, language: Optional[str] = None, language_id: Optional[str] = None
    ) -> Optional[str]:
        """Legacy method - redirects to unified method"""
        return self.get_prompt_content(activity_type, level, "feedback", language, language_id)

    # ===============================
    # UTILITY METHODS
    # ===============================

    def get_available_prompt_types(self) -> List[str]:
        """Get list of all supported prompt types"""
        return ["question", "bulk_question", "feedback", "batch_analysis"]

    def get_available_languages(self) -> List[str]:
        """Get list of languages that have prompt templates available"""
        available_languages = []

        supported_languages = self._get_supported_languages()
        for language in supported_languages:
            # Check if at least one template exists for this language
            has_templates = any(
                key.startswith(f"{language}_") for key in self.templates.keys()
            )
            if has_templates:
                available_languages.append(language)

        return available_languages

    def get_language_stats(self) -> Dict[str, Dict[str, int]]:
        """Get statistics about available prompts by language"""
        stats = {}

        supported_languages = self._get_supported_languages()
        for language in supported_languages:
            language_stats = {
                "total_templates": 0,
                "by_prompt_type": {
                    "question": 0,
                    "bulk_question": 0,
                    "feedback": 0,
                    "batch_analysis": 0,
                },
                "by_activity": {
                    "reading": 0,
                    "writing": 0,
                    "grammar": 0,
                    "hearing": 0,
                },
                "by_level": {"A1": 0, "A2": 0, "B1": 0},
            }

            for key in self.templates.keys():
                if key.startswith(f"{language}_"):
                    language_stats["total_templates"] += 1

                    # Extract components: {language_id}_reading_A1_bulk_question
                    parts = key.split("_")
                    if len(parts) >= 4:
                        activity = parts[1]
                        level = parts[2]
                        prompt_type = "_".join(parts[3:])  # Handle multi-word types

                        if activity in language_stats["by_activity"]:
                            language_stats["by_activity"][activity] += 1

                        if level in language_stats["by_level"]:
                            language_stats["by_level"][level] += 1

                        if prompt_type in language_stats["by_prompt_type"]:
                            language_stats["by_prompt_type"][prompt_type] += 1

            stats[language] = language_stats

        return stats

    def list_available_prompts(
        self,
        language: Optional[str] = None,
        level: Optional[str] = None,
        activity_type: Optional[str] = None,
    ) -> List[Dict]:
        """
        List available prompts with detailed information for admin management

        Args:
            language: Optional language filter (e.g., language ID)
            level: Optional level filter (e.g., 'A1', 'A2', 'B1')
            activity_type: Optional activity filter

        Returns:
            List of prompt info dictionaries with details
        """
        prompts = []

        # Get all available languages or filter by specified language
        if language:
            # Use language directly (assume it's already an ID or will be handled by template matching)
            languages_to_check = [language]
        else:
            languages_to_check = self.get_available_languages()

        # Define the structure we want to return
        levels = ["A1", "A2", "B1", "B2"] if not level else [level]
        activities = (
            ["reading", "writing", "grammar", "hearing", "speaking"]
            if not activity_type
            else [activity_type]
        )
        prompt_types = ["question", "bulk_question", "feedback", "batch_analysis"]

        for lang in languages_to_check:
            for lvl in levels:
                for activity in activities:
                    for prompt_type in prompt_types:
                        # Check if this template exists
                        template_key = f"{lang}_{activity}_{lvl}_{prompt_type}"

                        # Check if template exists and get file path
                        file_path = self._get_prompt_file_path(
                            lang, lvl, activity, prompt_type
                        )
                        exists = template_key in self.templates

                        display_name = (
                            f"{activity.title()} "
                            f"{prompt_type.replace('_', ' ').title()}"
                        )

                        prompt_info = {
                            "name": f"{activity}_{prompt_type}",
                            "display_name": display_name,
                            "type": prompt_type,
                            "exists": exists,
                            "file_path": file_path,
                            "language": lang,
                            "level": lvl,
                            "activity": activity,
                            "template_key": template_key,
                        }

                        prompts.append(prompt_info)

        return prompts

    def _get_prompt_file_path(
        self, language: str, level: str, activity: str, prompt_type: str
    ) -> str:
        """Get the expected file path for a prompt template"""
        if prompt_type == "question":
            # Legacy format: reading.txt
            filename = f"{activity}.txt"
        else:
            # New format: reading_bulk_question.txt
            filename = f"{activity}_{prompt_type}.txt"

        return os.path.join(self.prompts_base_dir, language, level, filename)
