import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useTeacherName } from "@/hooks/useTeacherName"

interface PreviewFeature {
    icon: string
    title: string
    description: string
}

interface PreviewBlockProps {
    title: string
    subtitle: string
    mainIcon: string
    features: PreviewFeature[]
    ctaText: string
    onCTAClick: () => void
    className?: string
}

const PreviewBlock: React.FC<PreviewBlockProps> = ({
    title,
    subtitle,
    mainIcon,
    features,
    ctaText,
    onCTAClick,
    className
}) => {
    const { teacherName } = useTeacherName();
    
    return (
        <div className={cn("min-h-screen bg-gray-50", className)}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    <p className="mt-2 text-gray-600">{subtitle}</p>
                </div>

                <Card className="border-eu-blue/20 bg-gradient-to-br from-eu-blue/5 to-white">
                    <CardHeader className="text-center">
                        <Avatar size="xl" className="mx-auto mb-4">
                            <span className="text-white font-bold text-2xl">{mainIcon}</span>
                        </Avatar>
                        <CardTitle className="text-2xl text-gray-900">
                            {teacherName}'s {title.includes('Exam') ? 'CEFR Assessment' : 'Learning with Real Feedback'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-100">
                                    <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                                        <p className="text-sm text-gray-600">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center bg-gray-50 p-6 rounded-lg">
                            <p className="text-gray-700 mb-4 font-medium">
                                ✨ {teacherName} gives you honest feedback that helps you improve for real
                            </p>
                            <div className="space-y-3">
                                <Button
                                    onClick={onCTAClick}
                                    className="w-full bg-eu-blue hover:bg-eu-blue/90 text-white font-semibold py-4 text-base"
                                >
                                    {ctaText}
                                </Button>
                                <p className="text-sm text-gray-600">
                                    New here? <button
                                        onClick={() => {
                                            // Contact section removed - guide users to sign up or settings
                                            if (typeof window !== 'undefined') {
                                                window.location.href = '/signup';
                                            }
                                        }}
                                        className="text-eu-blue hover:underline"
                                    >
                                        Get Started Today!
                                    </button>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export { PreviewBlock } 