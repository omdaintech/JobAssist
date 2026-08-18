export const ACTIVITY_TYPES = {
  reading: {
    name: "Reading Comprehension",
    shortName: "Reading",
    icon: "📖",
    color: "bg-blue-100 text-blue-700",
  },
  writing: {
    name: "Writing Tasks",
    shortName: "Writing",
    icon: "✍️",
    color: "bg-green-100 text-green-700",
  },

  grammar: {
    name: "Grammar Exercises",
    shortName: "Grammar",
    icon: "📝",
    color: "bg-orange-100 text-orange-700",
  },
  hearing: {
    name: "Listening Comprehension",
    shortName: "Listening",
    icon: "🎧",
    color: "bg-purple-100 text-purple-700",
  },
  speaking: {
    name: "Speaking Practice",
    shortName: "Speaking",
    icon: "🎤",
    color: "bg-pink-100 text-pink-700",
  },
  exam: {
    name: "Exam",
    shortName: "Exam",
    icon: "🎯",
    color: "bg-indigo-100 text-indigo-700",
  },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

// Helper functions for consistent usage
export const getActivityIcon = (activityType: string): string => {
  return ACTIVITY_TYPES[activityType as ActivityType]?.icon || "📝";
};

export const getActivityName = (
  activityType: string,
  useShort: boolean = false
): string => {
  const activity = ACTIVITY_TYPES[activityType as ActivityType];
  if (!activity) return activityType;
  return useShort ? activity.shortName : activity.name;
};

export const getActivityColor = (activityType: string): string => {
  return (
    ACTIVITY_TYPES[activityType as ActivityType]?.color ||
    "bg-gray-100 text-gray-700"
  );
};

export const formatActivityType = (activityType: string): string => {
  return activityType.charAt(0).toUpperCase() + activityType.slice(1);
};
