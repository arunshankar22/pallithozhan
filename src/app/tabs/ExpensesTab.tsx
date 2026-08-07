import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform
} from 'react-native';

import {
  Plus,
  X,
  Trash2,
  Edit,
  CheckCircle,
  FileText,
  Eye,
  ArrowUpDown,
  Table,
  LayoutGrid,
  Shield,
  CircleSlash,
  Sparkles
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { Spacing } from '@/constants/theme';
import { expenseService, Expense, ExpenseApproverConfig } from '@/services/expenseService';

export function ExpensesTab({ user, colors, t, showToast, i18n, insets }: TabProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  // View state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<ExpenseApproverConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Filtering
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof Expense>('dateSubmitted');
  const [sortAscending, setSortAscending] = useState(false);

  // Form states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('teaching materials');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number; url: string }[]>([]);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Approval / Action state
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [reimburseRef, setReimburseRef] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await expenseService.getExpenses();
      const cfg = await expenseService.getApproverConfig();
      setExpenses(list);
      setConfig(cfg);
    } catch (e) {
      showToast('Failed to load expense tracker data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  const isApprover = (uid: string) => {
    if (!config) return false;
    return (config.treasurerUids || []).includes(uid) || 
           (config.secretaryUids || []).includes(uid) || 
           (config.presidentUids || []).includes(uid);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const hasAccess = isAdmin || isApprover(user?.uid) || (config?.allowedSubmitRoles || []).includes(user?.role || '');

  // Determines who can see what:
  // Treasurer, Secretary, President, and Admins can see all. Regular submitters only see their own.
  const canViewAll = isAdmin || isApprover(user?.uid);
  const visibleExpenses = expenses.filter(e => {
    if (canViewAll) return true;
    return e.submittedByUid === user?.uid;
  });

  // Category list
  const categories = [
    { value: 'teaching materials', label: i18n.language === 'ta' ? 'கல்வி பொருட்கள்' : 'Teaching Materials' },
    { value: 'catering', label: i18n.language === 'ta' ? 'உணவு' : 'Catering / Food' },
    { value: 'stationeries', label: i18n.language === 'ta' ? 'எழுதுபொருட்கள்' : 'Stationeries' },
    { value: 'events', label: i18n.language === 'ta' ? 'நிகழ்ச்சிகள்' : 'Events props' },
    { value: 'rentals', label: i18n.language === 'ta' ? 'வாடகை' : 'Rentals / Venue' },
    { value: 'other', label: i18n.language === 'ta' ? 'இதர செலவுகள்' : 'Other' }
  ];

  // Sorting logic
  const handleSort = (field: keyof Expense) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const sortedExpenses = [...visibleExpenses].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'amount') {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortAscending ? -1 : 1;
    if (aVal > bVal) return sortAscending ? 1 : -1;
    return 0;
  });

  // Filter logic
  const filteredExpenses = sortedExpenses.filter(e => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return e.status === 'Pending Approval';
    if (statusFilter === 'approved') return e.status === 'Approved' && e.paymentStatus === 'Pending Payment';
    if (statusFilter === 'paid') return e.paymentStatus === 'Paid';
    if (statusFilter === 'rejected') return e.status === 'Rejected';
    return true;
  });

  // File Picker Handlers
  const handlePickFile = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,application/pdf';
        input.onchange = async (e: any) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const newFiles: { name: string; size: number; url: string }[] = [];
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.size > 10 * 1024 * 1024) {
                showToast('File exceeds 10MB limit.', 'warning');
                continue;
              }
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
            setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
          }
        };
        input.click();
      } catch (err) {
        console.warn('Web file picker error:', err);
      }
    } else {
      try {
        const DocumentPicker = require('expo-document-picker');
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          multiple: true
        });

        if (!res.canceled && res.assets) {
          const newFiles: { name: string; size: number; url: string }[] = [];
          for (const asset of res.assets) {
            if (asset.size && asset.size > 10 * 1024 * 1024) {
              showToast('File exceeds 10MB limit.', 'warning');
              continue;
            }
            newFiles.push({
              name: asset.name,
              size: asset.size || 0,
              url: asset.uri
            });
          }
          setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
        }
      } catch (err) {
        showToast('Document Picker error.', 'error');
      }
    }
  };

  const handleScanReceipt = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = async (e: any) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const file = files[0];
            if (file.size > 10 * 1024 * 1024) {
              showToast('File exceeds 10MB limit.', 'warning');
              return;
            }
            setScanning(true);
            try {
              const fileData = await new Promise<{ name: string; size: number; url: string; base64: string }>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    name: file.name,
                    size: file.size,
                    url: reader.result as string,
                    base64: reader.result as string
                  });
                };
                reader.readAsDataURL(file);
              });

              // Compress if it is an image to fit payload size limits (e.g. Vercel 4.5MB limit)
              let scanBase64 = fileData.base64;
              if (file.type.startsWith('image/')) {
                try {
                  scanBase64 = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      const MAX_SIZE = 1000;
                      if (width > height) {
                        if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                        }
                      } else {
                        if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      resolve(canvas.toDataURL('image/jpeg', 0.6));
                    };
                    img.src = fileData.base64;
                  });
                } catch (compressErr) {
                  console.warn('Failed to compress web image:', compressErr);
                }
              }

              // Call AI Scanner
              const scanResult = await expenseService.scanReceipt(scanBase64, file.type || 'image/jpeg');
              
              // Autofill form fields
              setTitle(scanResult.title || '');
              setAmount(String(scanResult.amount || ''));
              setCategory(scanResult.category || 'other');
              setNotes(scanResult.notes || '');

              // Attach file to form automatically
              setAttachedFiles([{ name: fileData.name, size: fileData.size, url: fileData.url }]);
              showToast('Receipt scanned & fields populated!', 'success');
            } catch (err: any) {
              console.warn('Smart Receipt Scanner error:', err);
              showToast('Smart scan failed. Please enter manually.', 'error');
            } finally {
              setScanning(false);
            }
          }
        };
        input.click();
      } catch (err) {
        console.warn('Web file picker error:', err);
      }
    } else {
      try {
        const DocumentPicker = require('expo-document-picker');
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          multiple: false
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          if (asset.size && asset.size > 10 * 1024 * 1024) {
            showToast('File exceeds 10MB limit.', 'warning');
            return;
          }
          setScanning(true);
          try {
            const mimeType = asset.mimeType || 'image/jpeg';
            let scanUri = asset.uri;

            // Compress if it is an image using expo-image-manipulator on mobile
            if (mimeType.startsWith('image/')) {
              try {
                const ImageManipulator = require('expo-image-manipulator');
                const manipResult = await ImageManipulator.manipulateAsync(
                  asset.uri,
                  [{ resize: { width: 1000 } }], // downscale to width 1000px preserving ratio
                  { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // 60% quality jpeg
                );
                scanUri = manipResult.uri;
              } catch (manipErr) {
                console.warn('Failed to compress image on mobile, using original file:', manipErr);
              }
            }

            const FileSystem = require('expo-file-system');
            const base64Data = await FileSystem.readAsStringAsync(scanUri, {
              encoding: FileSystem.EncodingType.Base64
            });

            // Call AI Scanner
            const scanResult = await expenseService.scanReceipt(base64Data, mimeType);

            // Autofill form fields
            setTitle(scanResult.title || '');
            setAmount(String(scanResult.amount || ''));
            setCategory(scanResult.category || 'other');
            setNotes(scanResult.notes || '');

            // Attach file to form automatically
            setAttachedFiles([{ name: asset.name, size: asset.size || 0, url: asset.uri }]);
            showToast('Receipt scanned & fields populated!', 'success');
          } catch (err: any) {
            console.warn('Smart Receipt Scanner error:', err);
            showToast('Smart scan failed. Please enter manually.', 'error');
          } finally {
            setScanning(false);
          }
        }
      } catch (err) {
        showToast('Document Picker error.', 'error');
      }
    }
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Form submission handler (Create / Edit)
  const handleSubmitExpense = async () => {
    if (!title.trim()) {
      showToast(i18n.language === 'ta' ? 'தயவுசெய்து தலைப்பை உள்ளிடவும்!' : 'Please enter an expense title!', 'warning');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast(i18n.language === 'ta' ? 'தயவுசெய்து சரியான தொகையை உள்ளிடவும்!' : 'Please enter a valid expense amount!', 'warning');
      return;
    }
    if (attachedFiles.length === 0) {
      showToast(i18n.language === 'ta' ? 'தயவுசெய்து ஒரு ரசீதை இணைக்கவும்!' : 'Please attach at least one receipt file!', 'warning');
      return;
    }

    setSubmittingForm(true);
    try {
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.expenseId, {
          title: title.trim(),
          amount: parsedAmount,
          category,
          notes: notes.trim(),
          fileUrls: attachedFiles.map(f => f.url),
          fileNames: attachedFiles.map(f => f.name),
          fileSizes: attachedFiles.map(f => f.size)
        });
        showToast('Expense updated successfully!', 'success');
      } else {
        await expenseService.createExpense(
          {
            title: title.trim(),
            amount: parsedAmount,
            category,
            notes: notes.trim(),
            submittedBy: user?.fullName || 'Staff User',
            submittedByEmail: user?.email || '',
            submittedByUid: user?.uid || ''
          },
          attachedFiles
        );
        showToast('Expense submitted successfully for approval!', 'success');
      }
      setFormModalVisible(false);
      resetForm();
      loadData();
    } catch (e) {
      showToast('Failed to save expense claim.', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleEditInit = (exp: Expense) => {
    if (exp.status !== 'Pending Approval') {
      showToast('Cannot edit claims that are already actioned.', 'warning');
      return;
    }
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setNotes(exp.notes || '');
    setAttachedFiles((exp.fileUrls || []).map((url, i) => ({
      name: exp.fileNames[i] || `receipt_${i}.pdf`,
      size: (exp.fileSizes && exp.fileSizes[i]) || 0,
      url
    })));
    setFormModalVisible(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this expense claim?') 
      : true;

    if (confirmDelete) {
      try {
        await expenseService.deleteExpense(expenseId);
        showToast('Expense deleted successfully.', 'success');
        loadData();
      } catch (e) {
        showToast('Failed to delete expense.', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCategory('teaching materials');
    setNotes('');
    setAttachedFiles([]);
  };

  // Stage action workflow (Approve / Reject / Reimburse)
  const handleAction = async (action: 'Approved' | 'Rejected' | 'Paid') => {
    if (!selectedExpense) return;
    setProcessingAction(true);
    try {
      const nowStr = new Date().toISOString();
      const currentRole = selectedExpense.currentApproverRole;

      if (action === 'Paid') {
        if (!reimburseRef.trim()) {
          showToast('Payment reference transaction ID is required!', 'warning');
          setProcessingAction(false);
          return;
        }
        await expenseService.updateExpense(selectedExpense.expenseId, {
          paymentStatus: 'Paid',
          paidDate: nowStr.split('T')[0],
          paidBy: user?.fullName || 'Treasurer',
          paidByUid: user?.uid,
          paymentReference: reimburseRef.trim()
        });
        showToast('Reimbursement completed successfully!', 'success');
      } else {
        const nextRoleMap: Record<string, 'treasurer' | 'president' | 'completed'> = {
          secretary: 'treasurer',
          treasurer: 'president',
          president: 'completed'
        };

        const nextApproverRole = action === 'Approved' ? nextRoleMap[currentRole] : 'completed';
        const finalStatus = action === 'Rejected' 
          ? 'Rejected' 
          : (nextApproverRole === 'completed' ? 'Approved' : 'Pending Approval');

        const approvals = [...(selectedExpense.approvals || [])];
        approvals.push({
          role: currentRole as any,
          approvedBy: user?.fullName || 'Approver',
          approvedByEmail: user?.email || '',
          approvedByUid: user?.uid || '',
          dateActioned: nowStr,
          action,
          comments: actionComments.trim() || undefined
        });

        await expenseService.updateExpense(selectedExpense.expenseId, {
          status: finalStatus,
          currentApproverRole: nextApproverRole,
          approvals
        });
        showToast(action === 'Approved' ? 'Approved successfully!' : 'Rejected claim.', 'success');
      }
      
      setActionModalVisible(false);
      setActionComments('');
      setReimburseRef('');
      loadData();
    } catch (e) {
      showToast('Action process failed.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleViewFile = async (url: string, name: string) => {
    if (Platform.OS === 'web') {
      if (url.startsWith('data:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(url, '_blank');
      }
    } else {
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const localPath = `${FileSystem.cacheDirectory}${name}`;
        
        showToast('Downloading file to device...', 'success');
        if (url.startsWith('data:')) {
          const base64Data = url.split(',')[1];
          await FileSystem.writeAsStringAsync(localPath, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        } else {
          await FileSystem.downloadAsync(url, localPath);
        }
        await Sharing.shareAsync(localPath);
      } catch (e) {
        showToast('Failed to view file natively.', 'error');
      }
    }
  };

  if (!hasAccess) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four }}>
        <Shield size={64} color={colors.primary} style={{ marginBottom: 16 }} />
        <ThemedText style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', color: colors.text }}>
          {i18n.language === 'ta' ? 'அணுகல் மறுக்கப்பட்டது' : 'Access Restricted'}
        </ThemedText>
        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          {i18n.language === 'ta' 
            ? 'செலவு கண்காணிப்பு போர்ட்டலுக்கு உங்களுக்கு அனுமதி இல்லை. உங்கள் நிர்வாகியைத் தொடர்பு கொள்ளவும்.'
            : 'You do not have permission to view this Expense Tracker portal. Please check with an administrator.'
          }
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: Spacing.three }}>
      {/* Header and Add button */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.two }}>
        <View style={{ gap: 2 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>
            {i18n.language === 'ta' ? 'செலவு கண்காணிப்பு' : 'Expense Claims Tracker'}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
            {canViewAll 
              ? (i18n.language === 'ta' ? 'அனைத்து பயனர்களின் கோரிக்கைகள்' : 'Reviewing all submitted school claims')
              : (i18n.language === 'ta' ? 'உங்கள் செலவு பதிவுகள்' : 'Manage your school reimbursement requests')
            }
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={() => setViewMode(prev => prev === 'card' ? 'table' : 'card')}
            style={{
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {viewMode === 'card' ? <Table size={16} color={colors.text} /> : <LayoutGrid size={16} color={colors.text} />}
          </Pressable>

          <Pressable
            onPress={() => { resetForm(); setFormModalVisible(true); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.primary,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12
            }}
          >
            <Plus size={16} color="#FFF" />
            <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>
              {i18n.language === 'ta' ? 'செலவைச் சேர்' : 'Submit Claim'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: Spacing.two }}>
        {[
          { key: 'all', label: i18n.language === 'ta' ? 'அனைத்தும்' : 'All Claims' },
          { key: 'pending', label: i18n.language === 'ta' ? 'நிலுவையில் உள்ளவை' : 'Pending' },
          { key: 'approved', label: i18n.language === 'ta' ? 'பணம் செலுத்த வேண்டியவை' : 'Pending Payment' },
          { key: 'paid', label: i18n.language === 'ta' ? 'செலுத்தப்பட்டவை' : 'Reimbursed / Paid' },
          { key: 'rejected', label: i18n.language === 'ta' ? 'நிராகரிக்கப்பட்டவை' : 'Rejected' }
        ].map(tab => {
          const isSelected = statusFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setStatusFilter(tab.key as any)}
              style={[
                { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
                isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.cardBg }
              ]}
            >
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#FFF' : colors.text }}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Content Body */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.four }} />
      ) : filteredExpenses.length === 0 ? (
        <View style={{ padding: Spacing.four, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, alignItems: 'center' }}>
          <CircleSlash size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
            {i18n.language === 'ta' ? 'கோரிக்கைகள் எதுவும் இல்லை.' : 'No matching expense claims found.'}
          </ThemedText>
        </View>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12 }}>
          {filteredExpenses.map(exp => {
            const catLabel = categories.find(c => c.value === exp.category)?.label || exp.category;
            const waitingForRole = exp.currentApproverRole;
            const uidsList = config ? ((config as any)[`${waitingForRole}Uids`] || []) : [];
            const namesList = config ? ((config as any)[`${waitingForRole}Names`] || []) : [];
            const waitingForName = namesList.length > 0 ? namesList.join(', ') : 'No approver configured';
            const isPendingApproval = exp.status === 'Pending Approval';
            
            const userIsStageApprover = config && uidsList.includes(user?.uid) && isPendingApproval;
            const userIsPaidApprover = config && (config.treasurerUids || []).includes(user?.uid || '') && exp.status === 'Approved' && exp.paymentStatus === 'Pending Payment';

            return (
              <View
                key={exp.expenseId}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.cardBg,
                  gap: 12
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <ThemedText style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{exp.title}</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                      {i18n.language === 'ta' ? `சமர்ப்பித்தவர்: ${exp.submittedBy}` : `Submitted by ${exp.submittedBy}`} • {new Date(exp.dateSubmitted).toLocaleDateString('en-AU')}
                    </ThemedText>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <ThemedText style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                      ${exp.amount.toFixed(2)}
                    </ThemedText>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: exp.status === 'Approved' ? '#ebfbee' : exp.status === 'Rejected' ? '#fff5f5' : '#fff9db'
                    }}>
                      <ThemedText style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: exp.status === 'Approved' ? '#2b8a3e' : exp.status === 'Rejected' ? '#c92a2a' : '#e67700'
                      }}>
                        {exp.status}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border }}>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '800' }}>
                        {catLabel}
                      </ThemedText>
                    </View>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: exp.paymentStatus === 'Paid' ? '#ebfbee' : '#fff5f5', borderWidth: 0.5, borderColor: exp.paymentStatus === 'Paid' ? '#2b8a3e' : '#c92a2a' }}>
                      <ThemedText style={{ fontSize: 9, color: exp.paymentStatus === 'Paid' ? '#2b8a3e' : '#c92a2a', fontWeight: '800' }}>
                        {exp.paymentStatus === 'Paid' ? 'PAID / REIMBURSED' : 'UNPAID'}
                      </ThemedText>
                    </View>
                  </View>

                  {exp.notes ? (
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                      {exp.notes}
                    </ThemedText>
                  ) : null}
                </View>

                {exp.fileUrls && exp.fileUrls.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {exp.fileUrls.map((url, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleViewFile(url, exp.fileNames[index] || 'receipt.pdf')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: colors.background,
                          borderWidth: 0.5,
                          borderColor: colors.border,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 6
                        }}
                      >
                        <FileText size={11} color={colors.primary} />
                        <ThemedText style={{ fontSize: 10, color: colors.text, maxWidth: 120 }} numberOfLines={1}>
                          {exp.fileNames[index] || 'receipt'}
                        </ThemedText>
                        <Eye size={10} color={colors.textSecondary} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {exp.paymentStatus === 'Paid' && (
                  <View style={{ padding: 10, borderRadius: 8, backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border, gap: 2 }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '700', color: '#2b8a3e' }}>💰 Paid Details:</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: colors.text }}>
                      Reimbursed by {exp.paidBy} on {exp.paidDate} (Ref: {exp.paymentReference})
                    </ThemedText>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    {isPendingApproval ? (
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                        ⏳ Waiting for: <ThemedText style={{ fontWeight: '800', color: colors.primary }}>{waitingForRole.toUpperCase()} ({waitingForName})</ThemedText>
                      </ThemedText>
                    ) : exp.status === 'Approved' && exp.paymentStatus === 'Pending Payment' ? (
                      <ThemedText style={{ fontSize: 11, color: '#e67700', fontWeight: '800' }}>
                        💸 Pending bank payback / transfer
                      </ThemedText>
                    ) : (
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                        Workflow Completed
                      </ThemedText>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {userIsStageApprover && (
                      <Pressable
                        onPress={() => { setSelectedExpense(exp); setActionModalVisible(true); }}
                        style={{
                          backgroundColor: colors.primary,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8
                        }}
                      >
                        <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Review</ThemedText>
                      </Pressable>
                    )}

                    {userIsPaidApprover && (
                      <Pressable
                        onPress={() => { setSelectedExpense(exp); setActionModalVisible(true); }}
                        style={{
                          backgroundColor: '#2b8a3e',
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8
                        }}
                      >
                        <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Mark Paid</ThemedText>
                      </Pressable>
                    )}

                    {exp.submittedByUid === user?.uid && exp.status === 'Pending Approval' && (
                      <>
                        <Pressable
                          onPress={() => handleEditInit(exp)}
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            borderWidth: 0.5,
                            borderColor: colors.border,
                            backgroundColor: colors.background
                          }}
                        >
                          <Edit size={12} color={colors.text} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteExpense(exp.expenseId)}
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            borderWidth: 0.5,
                            borderColor: colors.border,
                            backgroundColor: colors.background
                          }}
                        >
                          <Trash2 size={12} color="#ff6b6b" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* TABLE VIEW */
        <ScrollView horizontal style={{ flex: 1 }}>
          <View style={{ minWidth: 900 }}>
            <View style={{
              flexDirection: 'row',
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderColor: colors.primary,
              backgroundColor: colors.cardBg,
              alignItems: 'center'
            }}>
              {[
                { field: 'title', label: 'Title / Description', width: 220 },
                { field: 'submittedBy', label: 'Submitted By', width: 140 },
                { field: 'category', label: 'Category', width: 120 },
                { field: 'amount', label: 'Amount', width: 90 },
                { field: 'dateSubmitted', label: 'Date', width: 100 },
                { field: 'status', label: 'Status', width: 110 },
                { field: 'paymentStatus', label: 'Payment', width: 100 }
              ].map(h => (
                <Pressable
                  key={h.field}
                  onPress={() => handleSort(h.field as any)}
                  style={{
                    width: h.width,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8
                  }}
                >
                  <ThemedText style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{h.label}</ThemedText>
                  {sortField === h.field && <ArrowUpDown size={10} color={colors.primary} />}
                </Pressable>
              ))}
              <View style={{ width: 120, paddingHorizontal: 8 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>Actions</ThemedText>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {filteredExpenses.map((exp, index) => {
                const catLabel = categories.find(c => c.value === exp.category)?.label || exp.category;
                const isPendingApproval = exp.status === 'Pending Approval';
                const waitingForRole = exp.currentApproverRole;
                const uidsList = config ? ((config as any)[`${waitingForRole}Uids`] || []) : [];
                const userIsStageApprover = config && uidsList.includes(user?.uid) && isPendingApproval;
                const userIsPaidApprover = config && (config.treasurerUids || []).includes(user?.uid || '') && exp.status === 'Approved' && exp.paymentStatus === 'Pending Payment';

                return (
                  <View
                    key={exp.expenseId}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderColor: colors.border,
                      backgroundColor: index % 2 === 0 ? colors.cardBg : colors.background,
                      alignItems: 'center'
                    }}
                  >
                    <View style={{ width: 220, paddingHorizontal: 8 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{exp.title}</ThemedText>
                      {exp.fileUrls && exp.fileUrls.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                          {exp.fileUrls.map((url, i) => (
                            <Pressable key={i} onPress={() => handleViewFile(url, exp.fileNames[i])} style={{ padding: 2 }}>
                              <FileText size={10} color={colors.primary} />
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ width: 140, paddingHorizontal: 8 }}>
                      <ThemedText style={{ fontSize: 11 }}>{exp.submittedBy}</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>{exp.submittedByEmail}</ThemedText>
                    </View>

                    <View style={{ width: 120, paddingHorizontal: 8 }}>
                      <ThemedText style={{ fontSize: 11 }}>{catLabel}</ThemedText>
                    </View>

                    <View style={{ width: 90, paddingHorizontal: 8 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '800' }}>${exp.amount.toFixed(2)}</ThemedText>
                    </View>

                    <View style={{ width: 100, paddingHorizontal: 8 }}>
                      <ThemedText style={{ fontSize: 11 }}>{new Date(exp.dateSubmitted).toLocaleDateString('en-AU')}</ThemedText>
                    </View>

                    <View style={{ width: 110, paddingHorizontal: 8 }}>
                      <View style={{
                        alignSelf: 'flex-start',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: exp.status === 'Approved' ? '#ebfbee' : exp.status === 'Rejected' ? '#fff5f5' : '#fff9db'
                      }}>
                        <ThemedText style={{
                          fontSize: 9,
                          fontWeight: '800',
                          color: exp.status === 'Approved' ? '#2b8a3e' : exp.status === 'Rejected' ? '#c92a2a' : '#e67700'
                        }}>{exp.status}</ThemedText>
                      </View>
                      {isPendingApproval && (
                        <ThemedText style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2 }}>
                          Waiting: {waitingForRole.toUpperCase()}
                        </ThemedText>
                      )}
                    </View>

                    <View style={{ width: 100, paddingHorizontal: 8 }}>
                      <View style={{
                        alignSelf: 'flex-start',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: exp.paymentStatus === 'Paid' ? '#ebfbee' : '#fff5f5'
                      }}>
                        <ThemedText style={{
                          fontSize: 9,
                          fontWeight: '800',
                          color: exp.paymentStatus === 'Paid' ? '#2b8a3e' : '#c92a2a'
                        }}>{exp.paymentStatus}</ThemedText>
                      </View>
                    </View>

                    <View style={{ width: 120, paddingHorizontal: 8, flexDirection: 'row', gap: 6 }}>
                      {userIsStageApprover && (
                        <Pressable
                          onPress={() => { setSelectedExpense(exp); setActionModalVisible(true); }}
                          style={{
                            backgroundColor: colors.primary,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            borderRadius: 6
                          }}
                        >
                          <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Review</ThemedText>
                        </Pressable>
                      )}

                      {userIsPaidApprover && (
                        <Pressable
                          onPress={() => { setSelectedExpense(exp); setActionModalVisible(true); }}
                          style={{
                            backgroundColor: '#2b8a3e',
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            borderRadius: 6
                          }}
                        >
                          <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Pay</ThemedText>
                        </Pressable>
                      )}

                      {exp.submittedByUid === user?.uid && exp.status === 'Pending Approval' && (
                        <>
                          <Pressable onPress={() => handleEditInit(exp)} style={{ padding: 4 }}>
                            <Edit size={11} color={colors.text} />
                          </Pressable>
                          <Pressable onPress={() => handleDeleteExpense(exp.expenseId)} style={{ padding: 4 }}>
                            <Trash2 size={11} color="#ff6b6b" />
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* ==================== EXPENSE SUBMISSION / EDIT MODAL ==================== */}
      <Modal visible={formModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%', maxWidth: 500, height: '80%' }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>
                {editingExpense ? 'Modify Expense Claim' : 'Submit New Expense'}
              </ThemedText>
              <Pressable onPress={() => setFormModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ gap: 12 }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Description / Title (தலைப்பு)*</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Tamil Class books Term 2"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Amount in AUD (தொகை)*</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 150.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Category (வகை)</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {categories.map(c => {
                    const isSel = category === c.value;
                    return (
                      <Pressable
                        key={c.value}
                        onPress={() => setCategory(c.value)}
                        style={[
                          { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
                          isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background }
                        ]}
                      >
                        <ThemedText style={{ fontSize: 10, fontWeight: '700', color: isSel ? '#FFF' : colors.text }}>
                          {c.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Additional Notes (குறிப்புகள்)</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Invoice details, store name, or reimbursement bank account detail..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={styles.formLabel}>Receipt / Invoice (ரசீது)*</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={handleScanReceipt}
                      disabled={scanning}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: colors.primaryLight,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 8
                      }}
                    >
                      <Sparkles size={11} color={colors.primary} />
                      <ThemedText style={{ fontSize: 11, color: colors.primary, fontWeight: '800' }}>
                        {scanning ? 'Scanning...' : 'Smart Scan'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handlePickFile}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 8
                      }}
                    >
                      <Plus size={11} color={colors.primary} />
                      <ThemedText style={{ fontSize: 11, color: colors.primary, fontWeight: '800' }}>Add File</ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={{ gap: 6, marginTop: 8 }}>
                  {attachedFiles.map((file, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: colors.background,
                        padding: 8,
                        borderRadius: 8,
                        borderWidth: 0.5,
                        borderColor: colors.border
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <FileText size={12} color={colors.primary} />
                        <ThemedText style={{ fontSize: 11, flex: 1 }} numberOfLines={1}>{file.name}</ThemedText>
                        {file.size > 0 && (
                          <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>
                            ({(file.size / 1024).toFixed(0)} KB)
                          </ThemedText>
                        )}
                      </View>
                      <Pressable onPress={() => handleRemoveFile(idx)} style={{ padding: 4 }}>
                        <X size={14} color="#ff6b6b" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.driveModalFooter}>
              <Pressable onPress={() => setFormModalVisible(false)} style={[styles.formCancelButton, { borderColor: colors.border }]}>
                <ThemedText>{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmitExpense}
                disabled={submittingForm}
                style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}
              >
                {submittingForm ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>
                    {editingExpense ? 'Save Updates' : 'Submit Claim'}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== ACTION DECISION / REIMBURSE MODAL ==================== */}
      <Modal visible={actionModalVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%', maxWidth: 450 }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>
                {selectedExpense?.status === 'Approved' ? 'Register Bank Payment' : 'Review Expense Claim'}
              </ThemedText>
              <Pressable onPress={() => setActionModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <ThemedText style={{ fontSize: 13 }}>
                Claim for: <ThemedText style={{ fontWeight: '800' }}>{selectedExpense?.title}</ThemedText>
              </ThemedText>
              <ThemedText style={{ fontSize: 13 }}>
                Amount: <ThemedText style={{ fontWeight: '800', color: colors.primary }}>${selectedExpense?.amount.toFixed(2)}</ThemedText>
              </ThemedText>

              {selectedExpense?.status === 'Approved' ? (
                <View style={{ gap: 8 }}>
                  <ThemedText style={styles.formLabel}>Bank Transfer Reference / Transaction ID*</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={reimburseRef}
                    onChangeText={setReimburseRef}
                    placeholder="e.g. TXN-1928471"
                    placeholderTextColor={colors.textSecondary}
                  />
                  
                  <Pressable
                    onPress={() => handleAction('Paid')}
                    disabled={processingAction}
                    style={({ pressed }) => [
                      { backgroundColor: '#2b8a3e', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
                      { opacity: pressed || processingAction ? 0.9 : 1 }
                    ]}
                  >
                    {processingAction ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>💸 Mark as Reimbursed</ThemedText>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <ThemedText style={styles.formLabel}>Comments / Approval Notes</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 60 }]}
                    value={actionComments}
                    onChangeText={setActionComments}
                    placeholder="Provide any feedback or approval reference notes..."
                    placeholderTextColor={colors.textSecondary}
                  />

                  <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: 12 }}>
                    <Pressable
                      onPress={() => handleAction('Rejected')}
                      disabled={processingAction}
                      style={({ pressed }) => [
                        { flex: 1, backgroundColor: '#c92a2a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
                        { opacity: pressed || processingAction ? 0.9 : 1 }
                      ]}
                    >
                      <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>❌ Reject</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAction('Approved')}
                      disabled={processingAction}
                      style={({ pressed }) => [
                        { flex: 1, backgroundColor: '#2b8a3e', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
                        { opacity: pressed || processingAction ? 0.9 : 1 }
                      ]}
                    >
                      <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>✅ Approve</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
