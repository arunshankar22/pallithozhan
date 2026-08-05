import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TabProps } from '@/app/sharedTypes';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import {
  Printer,
  FileText,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  FileDown,
  Trash2,
  Paperclip,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  AlertCircle
} from 'lucide-react-native';
import { PrintRequest } from '@/services/printRequestService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export function PrintRequestsTab({ showToast }: TabProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && screenWidth >= 1024;
  const isDark = false; // Balar Malar theme is light-based default
  const colors = Colors[isDark ? 'dark' : 'light'];

  // Tab State
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<PrintRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<PrintRequest | null>(null);

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [yearClass, setYearClass] = useState('Bridging');
  const [numPages, setNumPages] = useState('1');
  const [numCopies, setNumCopies] = useState('1');
  const [colorOption, setColorOption] = useState<'Color' | 'B/W'>('Color');
  const [dateRequired, setDateRequired] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number; url: string }[]>([]);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed' | 'Rejected'>('All');
  const [viewFilter, setViewFilter] = useState<'All' | 'MyRequests'>('All');

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);

  const isVolunteerOrAdmin = ['volunteer', 'admin', 'superadmin'].includes(user?.role || '');

  // Prefill default date required to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateRequired(tomorrow.toISOString().split('T')[0]);
  }, [showFormModal]);

  // Load Print Requests
  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getPrintRequests();
      setRequests(data);
      if (data.length > 0 && !activeRequest) {
        setActiveRequest(data[0]);
      }
    } catch (e) {
      console.warn('Failed to load print requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Web & Native Multi-File Picker
  const handleSelectFiles = async () => {
    if (attachedFiles.length >= 10) {
      showToast(i18n.language === 'ta' ? 'அதிகபட்சம் 10 கோப்புகள் மட்டுமே அனுமதிக்கப்படும்' : 'Maximum 10 files can be uploaded.', 'warning');
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,image/*,.doc,.docx';
        input.multiple = true;
        input.style.position = 'absolute';
        input.style.opacity = '0';
        document.body.appendChild(input);

        input.onchange = async (e: any) => {
          const files: FileList = e.target.files;
          if (files && files.length > 0) {
            const newFiles: { name: string; size: number; url: string }[] = [];
            
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.size > 10 * 1024 * 1024) {
                showToast(`${file.name} - ${i18n.language === 'ta' ? 'கோப்பு 10MB ஐ விட அதிகமாக உள்ளது' : 'File exceeds 10MB limit.'}`, 'warning');
                continue;
              }

              // Read file as Data URL (Base64) to allow offline storage/Demo Mode and Firebase Uploads
              const fileData = await new Promise<{ name: string; size: number; url: string }>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    name: file.name,
                    size: file.size,
                    url: reader.result as string
                  });
                };
                reader.readAsDataURL(file);
              });
              newFiles.push(fileData);
            }

            setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 10));
          }
          document.body.removeChild(input);
        };
        input.click();
      } catch (err) {
        console.warn('Web file picker error:', err);
      }
    } else {
      // Native Mobile File selection using expo-document-picker
      try {
        const DocumentPicker = require('expo-document-picker');
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          multiple: true
        });

        if (!res.canceled && res.assets) {
          const newFiles: { name: string; size: number; url: string }[] = [];
          for (const asset of res.assets) {
            if (asset.size && asset.size > 10 * 1024 * 1024) {
              showToast(`${asset.name} - ${i18n.language === 'ta' ? 'கோப்பு 10MB ஐ விட அதிகமாக உள்ளது' : 'File exceeds 10MB limit.'}`, 'warning');
              continue;
            }
            newFiles.push({
              name: asset.name,
              size: asset.size || 0,
              url: asset.uri
            });
          }
          setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 10));
        }
      } catch (err) {
        console.error('Native document picker error:', err);
      }
    }
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Request
  const handleSubmitRequest = async () => {
    if (attachedFiles.length === 0) {
      showToast(i18n.language === 'ta' ? 'தயவுசெய்து அச்சிட வேண்டிய கோப்பை இணைக்கவும்' : 'Please attach at least one file to print.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const firstFileName = attachedFiles[0].name;
      const displayFileName = attachedFiles.length > 1 
        ? `${firstFileName} (+${attachedFiles.length - 1} more)` 
        : firstFileName;

      const printRequestData = {
        fileName: displayFileName,
        yearClass,
        numPages: parseInt(numPages) || 1,
        numCopies: parseInt(numCopies) || 1,
        colorOption,
        contactName: user?.fullName || 'Staff',
        contactEmail: user?.email || '',
        dateRequired,
        notes
      };

      if (editingRequest) {
        const updated = await mockDb.updatePrintRequest(editingRequest.requestId, printRequestData, attachedFiles);
        if (updated) {
          setRequests(prev => prev.map(r => r.requestId === editingRequest.requestId ? updated : r));
          setActiveRequest(updated);
          showToast(i18n.language === 'ta' ? 'கோரிக்கை வெற்றிகரமாக புதுப்பிக்கப்பட்டது!' : 'Print request updated successfully!', 'success');
        }
      } else {
        const newReq = await mockDb.createPrintRequest(printRequestData, attachedFiles);
        setRequests(prev => [newReq, ...prev]);
        setActiveRequest(newReq);
        showToast(i18n.language === 'ta' ? 'கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!' : 'Print request submitted successfully!', 'success');
      }
      
      // Reset form
      setYearClass('Bridging');
      setNumPages('1');
      setNumCopies('1');
      setColorOption('Color');
      setNotes('');
      setAttachedFiles([]);
      setEditingRequest(null);
      setShowFormModal(false);
    } catch (e) {
      console.error('Submit failed:', e);
      showToast('Failed to submit print request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (requestId: string, status: 'In Progress' | 'Completed' | 'Rejected') => {
    try {
      const updated = await mockDb.updatePrintRequestStatus(requestId, status, user?.fullName || 'Staff');
      if (updated) {
        setRequests(prev => prev.map(r => r.requestId === requestId ? updated : r));
        setActiveRequest(updated);
        showToast(
          i18n.language === 'ta'
            ? `கோரிக்கை நிலை புதுப்பிக்கப்பட்டது: ${status}`
            : `Request status updated: ${status}`,
          'success'
        );
      }
    } catch (e) {
      console.warn('Failed to update status:', e);
      showToast('Failed to update status.', 'error');
    }
  };

  // Delete Request (Owner only)
  const handleDeleteRequest = async (requestId: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(i18n.language === 'ta' ? 'இந்த கோரிக்கையை நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to delete this print request?')) return;
    }
    try {
      await mockDb.deletePrintRequest(requestId);
      setRequests(prev => prev.filter(r => r.requestId !== requestId));
      setActiveRequest(prev => prev?.requestId === requestId ? null : prev);
      showToast(
        i18n.language === 'ta' ? 'கோரிக்கை நீக்கப்பட்டது' : 'Print request deleted successfully.',
        'success'
      );
    } catch (e) {
      console.warn('Delete failed:', e);
      showToast('Failed to delete print request.', 'error');
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to convert data URL to Blob for safe web rendering
  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn("Failed to convert dataURL to Blob:", e);
      return null;
    }
  };

  // Native Mobile File sharing/printing helper
  const handleOpenFileNative = async (url: string, name: string) => {
    try {
      showToast('Preparing document...', 'success');

      // Create a clean path in cache directory
      const cleanName = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${cleanName}`;

      if (url.startsWith('data:')) {
        // Parse base64 content
        const parts = url.split(';base64,');
        const base64Content = parts.pop() || '';
        await FileSystem.writeAsStringAsync(fileUri, base64Content, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // Download remote file
        await FileSystem.downloadAsync(url, fileUri);
      }

      // Check if sharing is available and open share sheet
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: url.startsWith('data:') ? url.split(';')[0].split(':')[1] : undefined,
          dialogTitle: `Open/Print ${name}`,
        });
      } else {
        showToast('Sharing is not available on this device', 'error');
      }
    } catch (error) {
      console.error("Error opening document natively:", error);
      showToast('Failed to open document', 'error');
    }
  };

  // Open single file preview or download
  const handleOpenFile = (url: string, name: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name) || url.startsWith('data:image/');
    const isPdf = /\.pdf$/i.test(name) || url.startsWith('data:application/pdf');

    if (Platform.OS === 'web') {
      let resolvedUrl = url;
      if (url.startsWith('data:')) {
        const blob = dataURLtoBlob(url);
        if (blob) {
          resolvedUrl = URL.createObjectURL(blob);
        }
      }

      if (isImage) {
        setPreviewFile({ name, url: resolvedUrl, type: 'image' });
      } else if (isPdf) {
        // Embed PDF inside preview modal or open new window
        setPreviewFile({ name, url: resolvedUrl, type: 'pdf' });
      } else {
        // Download document
        const link = document.createElement('a');
        link.href = resolvedUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // Native Mobile opens via our share helper
      handleOpenFileNative(url, name);
    }
  };

  // Bulk open files
  const handleOpenAllFiles = async (request: PrintRequest) => {
    if (Platform.OS === 'web') {
      request.fileUrls.forEach((url, i) => {
        const name = request.fileNames[i] || `file_${i}`;
        if (url.startsWith('data:')) {
          const blob = dataURLtoBlob(url);
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
          } else {
            window.open(url, '_blank');
          }
        } else {
          window.open(url, '_blank');
        }
      });
    } else {
      // Native Mobile: sequentially open sharing sheet for each file with a brief delay
      for (let i = 0; i < request.fileUrls.length; i++) {
        const url = request.fileUrls[i];
        const name = request.fileNames[i] || `file_${i}`;
        await handleOpenFileNative(url, name);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    let bgColor = '#FFF4E5';
    let textColor = '#B76E00';
    let Icon = Clock;

    if (status === 'In Progress') {
      bgColor = '#E5F6FF';
      textColor = '#006699';
      Icon = Clock;
    } else if (status === 'Completed') {
      bgColor = '#ECFDF3';
      textColor = '#027A48';
      Icon = CheckCircle;
    } else if (status === 'Rejected') {
      bgColor = '#FEF3F2';
      textColor = '#B42318';
      Icon = XCircle;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Icon size={12} color={textColor} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: textColor }}>
          {status}
        </ThemedText>
      </View>
    );
  };

  const filteredRequests = requests.filter(req => {
    // Status Filter
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    
    // View Filter (My requests only)
    if (viewFilter === 'MyRequests') {
      const userEmail = user?.email || '';
      if (req.contactEmail.toLowerCase() !== userEmail.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { flexDirection: isLargeScreen ? 'row' : 'column', justifyContent: 'space-between', alignItems: isLargeScreen ? 'center' : 'stretch', gap: 12 }]}>
        <View style={{ gap: 4 }}>
          <ThemedText style={styles.title}>
            {i18n.language === 'ta' ? 'அச்சிடும் கோரிக்கைகள்' : 'Print Requests'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {i18n.language === 'ta' ? 'வகுப்பு வினாத்தாள்கள் மற்றும் கற்றல் கோப்புகளை அச்சிட சமர்ப்பிக்கவும்' : 'Submit exam papers and class learning resources for volunteer printing'}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            setEditingRequest(null);
            setYearClass('Bridging');
            setNumPages('1');
            setNumCopies('1');
            setColorOption('Color');
            setNotes('');
            setAttachedFiles([]);
            setShowFormModal(true);
          }}
          style={[styles.primaryButton, { alignSelf: isLargeScreen ? 'auto' : 'flex-start' }]}
        >
          <Printer size={16} color="#FFF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.primaryButtonText}>
            {i18n.language === 'ta' ? 'புதிய கோரிக்கை' : '+ New Request'}
          </ThemedText>
        </Pressable>
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterBar}>
        {/* Status Filters Row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
          <Pressable
            onPress={() => setStatusFilter('All')}
            style={[styles.filterBtn, statusFilter === 'All' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, statusFilter === 'All' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'அனைத்தும்' : 'All'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('Pending')}
            style={[styles.filterBtn, statusFilter === 'Pending' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, statusFilter === 'Pending' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'காத்திருப்பவை' : 'Pending'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('In Progress')}
            style={[styles.filterBtn, statusFilter === 'In Progress' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, statusFilter === 'In Progress' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'அச்சிடப்படுபவை' : 'In Progress'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('Completed')}
            style={[styles.filterBtn, statusFilter === 'Completed' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, statusFilter === 'Completed' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'முடிந்தவை' : 'Completed'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Ownership Filters Row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 }}>
          <Pressable
            onPress={() => setViewFilter('All')}
            style={[styles.filterBtn, viewFilter === 'All' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, viewFilter === 'All' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'அனைத்து கோரிக்கைகள்' : 'All Requests'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setViewFilter('MyRequests')}
            style={[styles.filterBtn, viewFilter === 'MyRequests' && styles.filterBtnActive]}
          >
            <ThemedText style={[styles.filterBtnText, viewFilter === 'MyRequests' && styles.filterBtnTextActive]}>
              {i18n.language === 'ta' ? 'என் கோரிக்கைகள்' : 'My Requests'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.centerBox}>
          <Printer size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
          <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
            {i18n.language === 'ta' ? 'கோரிக்கைகள் ஏதும் இல்லை' : 'No print requests found.'}
          </ThemedText>
        </View>
      ) : (
        /* RESPONSIVE LAYOUT CONTAINER */
        <View style={[styles.layoutWrapper, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
          {/* LEFT LIST PANEL */}
          <View style={[styles.listPanel, isLargeScreen ? { flex: 4 } : { flex: 1 }]}>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {filteredRequests.map(req => {
                const isActive = activeRequest?.requestId === req.requestId;
                return (
                  <Pressable
                    key={req.requestId}
                    onPress={() => setActiveRequest(req)}
                    style={[
                      styles.card,
                      { borderColor: colors.border },
                      isActive && { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primaryLight }
                    ]}
                  >
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                            {req.fileName}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                            {req.yearClass} • {req.contactName}
                          </ThemedText>
                        </View>
                        {renderStatusBadge(req.status)}
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                          Required: {req.dateRequired}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                          {req.totalPages} {i18n.language === 'ta' ? 'பக்கங்கள்' : 'Total Pages'} ({req.numPages}p × {req.numCopies}c)
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* RIGHT DETAIL PANEL */}
          {activeRequest && (
            <View style={[styles.detailPanel, isLargeScreen ? { flex: 6, marginLeft: Spacing.four } : { marginTop: Spacing.four }]}>
              <ScrollView contentContainerStyle={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
                      {activeRequest.fileName}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                      Submitted on: {new Date(activeRequest.dateSubmitted).toLocaleString()}
                    </ThemedText>
                  </View>
                  {renderStatusBadge(activeRequest.status)}
                </View>

                {/* Grid Details */}
                <View style={styles.gridContainer}>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Year / Class</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.yearClass}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Date Required</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.dateRequired}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Pages per Copy</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.numPages}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Number of Copies</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.numCopies}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Total Pages to Print</ThemedText>
                    <ThemedText style={[styles.gridValue, { color: colors.primary, fontWeight: '900' }]}>
                      {activeRequest.totalPages}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Color Option</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.colorOption}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Requested By</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.contactName}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText style={styles.gridLabel}>Completed By</ThemedText>
                    <ThemedText style={styles.gridValue}>{activeRequest.completedBy || 'N/A'}</ThemedText>
                  </View>
                </View>

                {activeRequest.notes ? (
                  <View style={[styles.notesBox, { backgroundColor: colors.backgroundElement }]}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>
                      Special Instructions / Notes:
                    </ThemedText>
                    <ThemedText style={{ fontSize: 13, color: colors.text }}>{activeRequest.notes}</ThemedText>
                  </View>
                ) : null}

                {/* Attachments Section */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                      📁 Print Attachments ({activeRequest.fileUrls.length})
                    </ThemedText>
                    {activeRequest.fileUrls.length > 1 && (
                      <Pressable
                        onPress={() => handleOpenAllFiles(activeRequest)}
                        style={styles.actionBtnSmall}
                      >
                        <ExternalLink size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <ThemedText style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                          Print All Files
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>

                  <View style={{ gap: 8 }}>
                    {activeRequest.fileUrls.map((url, i) => {
                      const name = activeRequest.fileNames[i] || `Document_${i + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name) || url.startsWith('data:image/');
                      return (
                        <Pressable
                          key={i}
                          onPress={() => handleOpenFile(url, name)}
                          style={[styles.attachmentRow, { borderColor: colors.border }]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                            <FileText size={16} color={colors.primary} />
                            <ThemedText numberOfLines={1} style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                              {name}
                            </ThemedText>
                          </View>
                          
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            {isImage && <Eye size={14} color={colors.textSecondary} />}
                            <Download size={14} color={colors.primary} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Volunteer Action buttons */}
                {isVolunteerOrAdmin && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                    {activeRequest.status === 'Pending' && (
                      <Pressable
                        onPress={() => handleUpdateStatus(activeRequest.requestId, 'In Progress')}
                        style={[styles.actionBtn, { backgroundColor: '#E5F6FF', flex: 1 }]}
                      >
                        <Clock size={14} color="#006699" style={{ marginRight: 6 }} />
                        <ThemedText style={{ fontSize: 13, color: '#006699', fontWeight: '800' }}>Claim / Print</ThemedText>
                      </Pressable>
                    )}
                    {(activeRequest.status === 'Pending' || activeRequest.status === 'In Progress') && (
                      <>
                        <Pressable
                          onPress={() => handleUpdateStatus(activeRequest.requestId, 'Completed')}
                          style={[styles.actionBtn, { backgroundColor: '#ECFDF3', flex: 2 }]}
                        >
                          <CheckCircle size={14} color="#027A48" style={{ marginRight: 6 }} />
                          <ThemedText style={{ fontSize: 13, color: '#027A48', fontWeight: '800' }}>Mark Completed</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleUpdateStatus(activeRequest.requestId, 'Rejected')}
                          style={[styles.actionBtn, { backgroundColor: '#FEF3F2', flex: 1 }]}
                        >
                          <XCircle size={14} color="#B42318" style={{ marginRight: 6 }} />
                          <ThemedText style={{ fontSize: 13, color: '#B42318', fontWeight: '800' }}>Reject</ThemedText>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                {/* Owner Edit & Delete buttons */}
                {activeRequest.contactEmail.toLowerCase() === (user?.email || '').toLowerCase() && activeRequest.status === 'Pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Pressable
                      onPress={() => {
                        setEditingRequest(activeRequest);
                        setYearClass(activeRequest.yearClass);
                        setNumPages(String(activeRequest.numPages));
                        setNumCopies(String(activeRequest.numCopies));
                        setColorOption(activeRequest.colorOption);
                        setDateRequired(activeRequest.dateRequired);
                        setNotes(activeRequest.notes || '');
                        
                        const prefilledFiles = activeRequest.fileUrls.map((url, idx) => ({
                          name: activeRequest.fileNames[idx] || `file_${idx + 1}`,
                          size: activeRequest.fileSizes ? activeRequest.fileSizes[idx] || 0 : 0,
                          url
                        }));
                        setAttachedFiles(prefilledFiles);
                        setShowFormModal(true);
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#E5F6FF', flex: 1 }]}
                    >
                      <Printer size={14} color="#006699" style={{ marginRight: 6 }} />
                      <ThemedText style={{ fontSize: 13, color: '#006699', fontWeight: '800' }}>Edit Request</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteRequest(activeRequest.requestId)}
                      style={[styles.actionBtn, { backgroundColor: '#FEF3F2', flex: 1 }]}
                    >
                      <Trash2 size={14} color="#B42318" style={{ marginRight: 6 }} />
                      <ThemedText style={{ fontSize: 13, color: '#B42318', fontWeight: '800' }}>Delete Request</ThemedText>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* NEW REQUEST MODAL FORM */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                {i18n.language === 'ta' ? 'புதிய அச்சிடும் கோரிக்கை' : 'Create Print Request'}
              </ThemedText>
              <Pressable onPress={() => setShowFormModal(false)} style={{ padding: 4 }}>
                <XCircle size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              {/* Year/Class */}
              <View style={{ gap: 4 }}>
                <ThemedText style={styles.fieldLabel}>Year / Class</ThemedText>
                {Platform.OS === 'web' ? (
                  <select
                    value={yearClass}
                    onChange={(e) => setYearClass(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid ' + colors.border,
                      paddingLeft: 8,
                      paddingRight: 8,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: 13
                    }}
                  >
                    <option value="Bridging">Bridging</option>
                    <option value="KG">KG</option>
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                    <option value="Year 4">Year 4</option>
                    <option value="High Bridge">High Bridge / HSC</option>
                    <option value="Other">Other / Administration</option>
                  </select>
                ) : (
                  <TextInput
                    value={yearClass}
                    onChangeText={setYearClass}
                    placeholder="e.g. KG, Year 1"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  />
                )}
              </View>

              {/* Pages & Copies */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.fieldLabel}>Pages per Copy</ThemedText>
                  <TextInput
                    value={numPages}
                    onChangeText={setNumPages}
                    keyboardType="number-pad"
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.fieldLabel}>Number of Copies</ThemedText>
                  <TextInput
                    value={numCopies}
                    onChangeText={setNumCopies}
                    keyboardType="number-pad"
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  />
                </View>
              </View>

              {/* Total Computed Pages */}
              <View style={[styles.computedBox, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  Total printing workload:
                </ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '900', color: colors.primary }}>
                  {(parseInt(numPages) || 1) * (parseInt(numCopies) || 1)} pages total
                </ThemedText>
              </View>

              {/* Color Option */}
              <View style={{ gap: 4 }}>
                <ThemedText style={styles.fieldLabel}>Color/Black & White</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setColorOption('Color')}
                    style={[
                      styles.choiceBtn,
                      { borderColor: colors.border },
                      colorOption === 'Color' && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                    ]}
                  >
                    <ThemedText style={[styles.choiceBtnText, colorOption === 'Color' && { color: colors.primary }]}>
                      Color
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setColorOption('B/W')}
                    style={[
                      styles.choiceBtn,
                      { borderColor: colors.border },
                      colorOption === 'B/W' && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                    ]}
                  >
                    <ThemedText style={[styles.choiceBtnText, colorOption === 'B/W' && { color: colors.primary }]}>
                      Black & White (B/W)
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Date Required */}
              <View style={{ gap: 4 }}>
                <ThemedText style={styles.fieldLabel}>Date Required / தேவைப்படும் தேதி</ThemedText>
                <DateTimePicker
                  value={dateRequired}
                  onChange={setDateRequired}
                  colors={colors}
                  mode="date"
                />
              </View>

              {/* Special Instructions */}
              <View style={{ gap: 4 }}>
                <ThemedText style={styles.fieldLabel}>Notes / Instructions</ThemedText>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. double-sided, stapled..."
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { borderColor: colors.border, color: colors.text, height: 70, textAlignVertical: 'top' }]}
                />
              </View>

              {/* File Attachment Uploader */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.fieldLabel}>
                  📁 Upload Files (PDF / Image / DOCX) • max 10MB each
                </ThemedText>
                
                <Pressable
                  onPress={handleSelectFiles}
                  style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
                >
                  <Paperclip size={18} color={colors.primary} style={{ marginBottom: 4 }} />
                  <ThemedText style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
                    Select Files / கோப்புகளைத் தேர்ந்தெடு
                  </ThemedText>
                  <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                    Attached: {attachedFiles.length} / 10
                  </ThemedText>
                </Pressable>

                {attachedFiles.length > 0 && (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {attachedFiles.map((file, i) => (
                      <View key={i} style={[styles.attachedItem, { borderColor: colors.border }]}>
                        <FileText size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <ThemedText numberOfLines={1} style={{ fontSize: 12, flex: 1, color: colors.text }}>
                          {file.name}{file.size > 0 ? ` (${formatBytes(file.size)})` : ''}
                        </ThemedText>
                        <Pressable onPress={() => handleRemoveAttachedFile(i)} style={{ padding: 4 }}>
                          <Trash2 size={14} color="#B42318" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Submit Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => setShowFormModal(false)}
                  style={[styles.secondaryButton, { flex: 1 }]}
                >
                  <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                  style={[styles.primaryButton, { flex: 2 }, submitting && { opacity: 0.7 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>Submit Request</ThemedText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FILE PREVIEW MODAL */}
      <Modal visible={previewFile !== null} animationType="fade" transparent>
        <View style={styles.previewBg}>
          <View style={[styles.previewCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.previewHeader}>
              <ThemedText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', flex: 1, color: colors.text }}>
                Preview: {previewFile?.name}
              </ThemedText>
              <Pressable onPress={() => setPreviewFile(null)} style={{ padding: 4 }}>
                <XCircle size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.previewContent}>
              {previewFile?.type === 'image' ? (
                <Image
                  source={{ uri: previewFile.url }}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              ) : previewFile?.type === 'pdf' && Platform.OS === 'web' ? (
                <iframe
                  src={previewFile.url}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                  title="PDF Preview"
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={32} color={colors.textSecondary} />
                  <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                    No instant preview available for this format.
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      if (previewFile) Linking.openURL(previewFile.url);
                    }}
                    style={[styles.primaryButton, { marginTop: 8 }]}
                  >
                    <FileDown size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.primaryButtonText}>Download File</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  headerContainer: {
    gap: 8,
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E201B',
  },
  subtitle: {
    fontSize: 13,
    color: '#6C7063',
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#af2907', // Balar Malar Tamil School brand color (maroon)
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EAE2D5',
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#44473F',
    fontSize: 13,
    fontWeight: '800',
  },
  filterBar: {
    marginBottom: Spacing.three,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F7F4EB',
    borderWidth: 1,
    borderColor: '#EAE2D5',
  },
  filterBtnActive: {
    backgroundColor: '#af2907',
    borderColor: '#af2907',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C7063',
  },
  filterBtnTextActive: {
    color: '#FFF',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  layoutWrapper: {
    flex: 1,
  },
  listPanel: {
    maxHeight: (Platform.OS === 'web' ? '70vh' : 'auto') as any,
  },
  detailPanel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1.2,
    padding: Spacing.three,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#FDFCF7',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: '#EAE2D5',
  },
  gridItem: {
    width: '46%',
    gap: 2,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8F9288',
    textTransform: 'uppercase',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E201B',
  },
  notesBox: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    borderRadius: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
    paddingBottom: 10,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#44473F',
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1.2,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    fontSize: 13,
  },
  computedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAE2D5',
  },
  choiceBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  choiceBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C7063',
  },
  uploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
  },
  attachedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  previewBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewCard: {
    width: '100%',
    maxWidth: 900,
    height: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
    paddingBottom: 8,
    marginBottom: 8,
  },
  previewContent: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  }
}) as any;
