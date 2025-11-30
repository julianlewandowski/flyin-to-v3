import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, MessageSquare, Calendar, Users } from "lucide-react";

interface WaitlistSubmission {
  id: string;
  email: string;
  message: string;
  timestamp: string;
}

export const WaitlistAdmin = () => {
  const [submissions, setSubmissions] = useState<WaitlistSubmission[]>([]);

  useEffect(() => {
    const loadSubmissions = () => {
      const stored = localStorage.getItem('waitlist-submissions');
      if (stored) {
        setSubmissions(JSON.parse(stored));
      }
    };

    loadSubmissions();
  }, []);

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Message', 'Timestamp'],
      ...submissions.map(sub => [
        sub.email,
        `"${sub.message.replace(/"/g, '""')}"`,
        new Date(sub.timestamp).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyin-to-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Waitlist Admin</h1>
          <p className="text-muted-foreground">Manage your Flyin.to waitlist submissions</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
                  <p className="text-sm text-muted-foreground">Total Signups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {submissions.filter(sub => {
                      const today = new Date();
                      const subDate = new Date(sub.timestamp);
                      return subDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {submissions.filter(sub => sub.message.length > 50).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Detailed Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Submissions</h2>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No submissions yet</h3>
                <p className="text-muted-foreground">Waitlist submissions will appear here as users sign up.</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        {submission.email}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(submission.timestamp)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      New
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm font-medium text-foreground">Message:</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed ml-6">
                      {submission.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
