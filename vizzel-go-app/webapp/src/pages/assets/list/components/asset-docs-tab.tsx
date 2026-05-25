'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import {
  getAssetDocs,
  createAssetDoc,
  deleteAssetDoc,
  updateAssetDoc,
  AssetDoc,
} from '@/lib/assets';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { TEST_IDS } from '@/components/test-ids';

interface AssetDocsTabProps {
  assetID: number;
  organizationID: number;
}

export function AssetDocsTab({ assetID, organizationID }: AssetDocsTabProps) {
  const [docs, setDocs] = useState<AssetDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Doc State
  const [isAdding, setIsAdding] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocType, setNewDocType] = useState('pdf'); // Default to pdf

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocUrl, setEditDocUrl] = useState('');

  useEffect(() => {
    if (assetID) {
      loadDocs();
      resetForm();
    }
  }, [assetID]);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await getAssetDocs(assetID);
      setDocs(res.data || []);
    } catch (error) {
      console.error('Failed to load docs:', error);
      toast.error('โหลดเอกสารไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setIsAdding(false);
    setNewDocName('');
    setNewDocFile(null);
    setNewDocType('pdf');
    setEditingId(null);
  }

  async function handleCreate() {
    if (!newDocName || !newDocFile) return;

    setSubmitting(true);
    try {
      await createAssetDoc({
        assetID: assetID,
        organizationID: organizationID,
        docName: newDocName,
        doc: newDocFile,
        docType: newDocType,
      });
      await loadDocs();
      resetForm();
      toast.success('เพิ่มเอกสารสำเร็จ');
    } catch (error) {
      console.error('Failed to create doc:', error);
      toast.error('เพิ่มเอกสารไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(docID: number) {
    try {
      await deleteAssetDoc(docID);
      toast.success('ลบเอกสารสำเร็จ');
      await loadDocs();
    } catch (error) {
      console.error('Failed to delete doc:', error);
      toast.error('ลบเอกสารไม่สำเร็จ');
    }
  }

  function startEdit(doc: AssetDoc) {
    setEditingId(doc.id);
    setEditDocName(doc.docName);
    setEditDocUrl(doc.doc);
  }

  async function handleUpdate(docID: number) {
    setSubmitting(true);
    try {
      await updateAssetDoc({
        docAssetID: docID,
        docName: editDocName,
        // doc: editDocUrl, // Currently updateAssetDoc in assets.ts only supports name update via FormData logic I wrote,
        // or I need to check if I implemented file update support.
        // In assets.ts I wrote:
        // if (data.docName) formData.append("docName", data.docName);
        // I did NOT add logic for 'doc' string update in `updateAssetDoc` in assets.ts because I used FormData
        // and the controller expects a file for 'doc' field if it's being updated.
        // So editing URL string directly is not supported by my current `updateAssetDoc` implementation
        // nor likely by the backend controller (which expects file upload for 'doc').
        // So I will only update name here.
      });
      await loadDocs();
      setEditingId(null);
      toast.success('แก้ไขเอกสารสำเร็จ');
    } catch (error) {
      console.error('Failed to update doc:', error);
      toast.error('แก้ไขเอกสารไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add New Button */}
            {!isAdding && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setIsAdding(true)} data-testid={TEST_IDS.ASSET_DOCS.BUTTON_ADD_DOC}>
                  <Plus className="mr-2 h-4 w-4" /> เพิ่มเอกสาร
                </Button>
              </div>
            )}

            {/* Add New Form */}
            {isAdding && (
              <div className="bg-muted/20 space-y-4 rounded-md border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ชื่อเอกสาร</Label>
                    <Input
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="e.g. User Manual"
                      data-testid={TEST_IDS.ASSET_DOCS.INPUT_DOC_NAME}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ไฟล์เอกสาร</Label>
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setNewDocFile(file);
                      }}
                      data-testid={TEST_IDS.ASSET_DOCS.INPUT_DOC_FILE}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                    disabled={submitting}
                    data-testid={TEST_IDS.ASSET_DOCS.BUTTON_DOC_CANCEL}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={submitting || !newDocName || !newDocFile}
                    data-testid={TEST_IDS.ASSET_DOCS.BUTTON_DOC_SAVE}
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    บันทึก
                  </Button>
                </div>
              </div>
            )}

            {/* Documents Table */}
            <div className="rounded-md border">
              <Table data-testid={TEST_IDS.ASSET_DOCS.TABLE}>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อเอกสาร</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-[100px] text-right">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground h-24 text-center"
                      >
                        ไม่พบเอกสาร
                      </TableCell>
                    </TableRow>
                  ) : (
                    docs.map((doc) => (
                      <TableRow key={doc.id} data-testid={TEST_IDS.ASSET_DOCS.TABLE_ROW(doc.id)}>
                        <TableCell className="font-medium">
                          {editingId === doc.id ? (
                            <Input
                              value={editDocName}
                              onChange={(e) => setEditDocName(e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="text-muted-foreground h-4 w-4" />
                              {doc.docName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* We don't support editing URL directly as it's a file path */}
                          <a
                            href={
                              doc.doc.startsWith('http')
                                ? doc.doc
                                : `${process.env.NEXT_PUBLIC_API_URL}/${doc.doc}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="flex max-w-[300px] items-center gap-1 truncate text-sm text-blue-600 hover:underline"
                            data-testid={TEST_IDS.ASSET_DOCS.BUTTON_ROW_DOWNLOAD(doc.id)}
                          >
                            {doc.docName}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === doc.id ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600"
                                onClick={() => handleUpdate(doc.id)}
                                disabled={submitting}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground h-8 w-8"
                                onClick={() => setEditingId(null)}
                                disabled={submitting}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary h-8 w-8"
                                onClick={() => startEdit(doc)}
                                data-testid={TEST_IDS.ASSET_DOCS.BUTTON_ROW_EDIT(doc.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <ConfirmDeleteDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                                    data-testid={TEST_IDS.ASSET_DOCS.BUTTON_ROW_DELETE(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                                title="ยืนยันการลบเอกสาร?"
                                description={`คุณต้องการลบเอกสาร "${doc.docName}" ใช่หรือไม่?`}
                                onConfirm={() => handleDelete(doc.id)}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
