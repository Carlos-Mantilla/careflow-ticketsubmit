import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Users, BarChart3, TrendingUp, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { SurveyResponse } from "@shared/schema";

export default function Dashboard() {
  const { data: surveysData, isLoading } = useQuery<{ surveys: SurveyResponse[] }>({
    queryKey: ["/api/surveys"],
  });

  const surveys = surveysData?.surveys || [];

  const totalResponses = surveys.length;
  const withAudio = surveys.filter(s => s.whatsappWorkflowAudio || s.firstPatientProcessAudio).length;
  const withSchedule = surveys.filter(s => s.scheduledDate).length;
  const sentToN8n = surveys.filter(s => s.sentToN8n).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="dashboard-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground" data-testid="text-loading">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Panel de Análisis</h1>
          <p className="text-muted-foreground mt-2">Resumen de encuestas de pre-onboarding de Careflow</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card data-testid="card-total-responses">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Respuestas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-responses">{totalResponses}</div>
              <p className="text-xs text-muted-foreground">Encuestas completadas</p>
            </CardContent>
          </Card>

          <Card data-testid="card-with-audio">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Audio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-with-audio">{withAudio}</div>
              <p className="text-xs text-muted-foreground">
                {totalResponses > 0 ? Math.round((withAudio / totalResponses) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-with-schedule">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reuniones Agendadas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-with-schedule">{withSchedule}</div>
              <p className="text-xs text-muted-foreground">
                {totalResponses > 0 ? Math.round((withSchedule / totalResponses) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-sent-n8n">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviado a n8n</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-sent-n8n">{sentToN8n}</div>
              <p className="text-xs text-muted-foreground">
                {totalResponses > 0 ? Math.round((sentToN8n / totalResponses) * 100) : 0}% procesado
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Respuestas Recientes</CardTitle>
            <CardDescription>Últimas encuestas completadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {surveys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-surveys">
                  No hay encuestas completadas aún
                </p>
              ) : (
                surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="flex items-start justify-between p-4 rounded-lg border hover-elevate active-elevate-2"
                    data-testid={`survey-${survey.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold" data-testid={`text-business-name-${survey.id}`}>
                          {survey.businessName}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span data-testid={`text-email-${survey.id}`}>{survey.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span data-testid={`text-manager-${survey.id}`}>
                            {survey.managerName} - {survey.managerWhatsapp}
                          </span>
                        </div>
                        {survey.scheduledDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span data-testid={`text-schedule-${survey.id}`}>
                              Reunión: {survey.scheduledDate} a las {survey.scheduledTime}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary" data-testid={`badge-services-${survey.id}`}>
                          {survey.services}
                        </Badge>
                        {survey.whatsappWorkflowAudio && (
                          <Badge variant="outline" data-testid={`badge-whatsapp-audio-${survey.id}`}>
                            Audio WhatsApp
                          </Badge>
                        )}
                        {survey.firstPatientProcessAudio && (
                          <Badge variant="outline" data-testid={`badge-patient-audio-${survey.id}`}>
                            Audio Proceso
                          </Badge>
                        )}
                        {survey.sentToN8n && (
                          <Badge variant="default" data-testid={`badge-n8n-${survey.id}`}>
                            Enviado a n8n
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-submitted-${survey.id}`}>
                      {format(new Date(survey.submittedAt), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
