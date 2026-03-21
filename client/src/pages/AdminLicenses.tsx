import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Key, Server, Edit, Trash2, Eye, Copy, Check } from "lucide-react";


export default function AdminLicenses() {
  return (
    <AdminLayout>
      <LicensesContent />
    </AdminLayout>
  );
}

function LicensesContent() {
  const utils = trpc.useUtils();
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Form state
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [tier, setTier] = useState<"starter" | "professional" | "enterprise">("professional");
  const [validityMonths, setValidityMonths] = useState<number | undefined>(12);
  const [generatedKey, setGeneratedKey] = useState("");
  
  // Queries
  const { data: licenses = [], isLoading } = trpc.licenses.list.useQuery();
  const { data: deployments = [] } = trpc.deployments.list.useQuery();
  
  // Mutations
  const generateKey = trpc.licenses.generateKey.useMutation({
    onSuccess: (data) => {
      utils.licenses.list.invalidate();
      setGeneratedKey(data.key);
      alert("License created successfully");
    },
  });
  
  const updateLicense = trpc.licenses.update.useMutation({
    onSuccess: () => {
      utils.licenses.list.invalidate();
      alert("License updated successfully");
      setShowEditDialog(false);
    },
  });
  
  const deleteLicense = trpc.licenses.delete.useMutation({
    onSuccess: () => {
      utils.licenses.list.invalidate();
      alert("License deleted successfully");
    },
  });
  
  const resetForm = () => {
    setClientName("");
    setEmail("");
    setDomain("");
    setTier("professional");
    setValidityMonths(12);
    setGeneratedKey("");
  };
  
  const handleGenerateLicense = () => {
    generateKey.mutate({
      clientName,
      email,
      domain,
      tier,
      validityMonths,
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    // Copied
  };
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "secondary",
      suspended: "destructive",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };
  
  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      starter: "bg-blue-100 text-blue-800",
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-amber-100 text-amber-800",
    };
    return <Badge className={colors[tier] || ""}>{tier}</Badge>;
  };
  
  const getDeploymentsForLicense = (licenseId: number) => {
    return deployments.filter(d => d.licenseId === licenseId);
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">License Management</h1>
        <p className="text-muted-foreground">
          Manage white-label licenses and track client deployments
        </p>
      </div>
      
      <Tabs defaultValue="licenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="licenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Active Licenses</h2>
              <p className="text-sm text-muted-foreground">
                {licenses.length} total licenses
              </p>
            </div>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate License
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Deployments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : licenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No licenses yet. Generate your first license to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    licenses.map((license: any) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-medium">{license.clientName}</TableCell>
                        <TableCell>{license.domain}</TableCell>
                        <TableCell>{getTierBadge(license.tier)}</TableCell>
                        <TableCell>{getStatusBadge(license.status)}</TableCell>
                        <TableCell>
                          {new Date(license.issuedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {license.expiresAt
                            ? new Date(license.expiresAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {getDeploymentsForLicense(license.id).length}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLicense(license);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLicense(license);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this license?")) {
                                  deleteLicense.mutate({ id: license.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deployments" className="space-y-4">
          <h2 className="text-2xl font-semibold">Client Deployments</h2>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Last Check-in</TableHead>
                    <TableHead>Deployed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No deployments tracked yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deployments.map((deployment: any) => {
                      const license = licenses.find((l: any) => l.id === deployment.licenseId);
                      return (
                        <TableRow key={deployment.id}>
                          <TableCell className="font-medium">
                            {license?.clientName || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {deployment.deploymentUrl ? (
                              <a
                                href={deployment.deploymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {deployment.deploymentUrl}
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{deployment.engineVersion}</TableCell>
                          <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                          <TableCell>{deployment.articlesGenerated}</TableCell>
                          <TableCell>
                            {deployment.lastCheckIn
                              ? new Date(deployment.lastCheckIn).toLocaleString()
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            {new Date(deployment.deployedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Licenses</CardTitle>
                <CardDescription>All time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{licenses.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Active Licenses</CardTitle>
                <CardDescription>Currently active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {licenses.filter((l: any) => l.status === "active").length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Total Deployments</CardTitle>
                <CardDescription>All clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{deployments.length}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>License Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {["starter", "professional", "enterprise"].map((tier) => {
                  const count = licenses.filter((l: any) => l.tier === tier).length;
                  const percentage = licenses.length > 0 ? (count / licenses.length) * 100 : 0;
                  return (
                    <div key={tier} className="flex items-center gap-4">
                      <div className="w-32">{getTierBadge(tier)}</div>
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Generate License Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate New License</DialogTitle>
            <DialogDescription>
              Create a new license key for a client deployment
            </DialogDescription>
          </DialogHeader>
          
          {generatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium text-green-900 mb-2">
                  ✓ License generated successfully!
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border rounded text-xs break-all">
                    {generatedKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedKey)}
                  >
                    {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Copy the license key above</li>
                  <li>Send it to the client securely</li>
                  <li>Client runs deployment setup with this key</li>
                </ol>
              </div>
              
              <DialogFooter>
                <Button onClick={() => {
                  setShowGenerateDialog(false);
                  resetForm();
                }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="TechSatire Inc"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@techsatire.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="techsatire.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier">License Tier</Label>
                  <Select value={tier} onValueChange={(v: any) => setTier(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="validity">Validity (months)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={validityMonths || ""}
                    onChange={(e) => setValidityMonths(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="12 (leave empty for lifetime)"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateLicense}
                  disabled={!clientName || !email || !domain}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Generate License
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* View License Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>License Details</DialogTitle>
          </DialogHeader>
          
          {selectedLicense && (
            <div className="space-y-4">
              <div>
                <Label>License Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-secondary rounded text-xs break-all">
                    {selectedLicense.licenseKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedLicense.licenseKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Client Name</Label>
                  <p className="mt-1">{selectedLicense.clientName}</p>
                </div>
                
                <div>
                  <Label>Email</Label>
                  <p className="mt-1">{selectedLicense.email}</p>
                </div>
                
                <div>
                  <Label>Domain</Label>
                  <p className="mt-1">{selectedLicense.domain}</p>
                </div>
                
                <div>
                  <Label>Tier</Label>
                  <p className="mt-1">{getTierBadge(selectedLicense.tier)}</p>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <p className="mt-1">{getStatusBadge(selectedLicense.status)}</p>
                </div>
                
                <div>
                  <Label>Issued</Label>
                  <p className="mt-1">
                    {new Date(selectedLicense.issuedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <Label>Expires</Label>
                  <p className="mt-1">
                    {selectedLicense.expiresAt
                      ? new Date(selectedLicense.expiresAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
              
              {selectedLicense.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedLicense.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit License Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit License</DialogTitle>
          </DialogHeader>
          
          {selectedLicense && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={selectedLicense.status}
                  onValueChange={(v) =>
                    setSelectedLicense({ ...selectedLicense, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={selectedLicense.notes || ""}
                  onChange={(e) =>
                    setSelectedLicense({ ...selectedLicense, notes: e.target.value })
                  }
                  placeholder="Add notes about this license..."
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateLicense.mutate({
                      id: selectedLicense.id,
                      status: selectedLicense.status,
                      notes: selectedLicense.notes,
                    });
                  }}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
