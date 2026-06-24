import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  Image
} from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import {
  Newspaper,
  Plus,
  ChevronDown,
  Filter,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon
} from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/VideoPlayer';
import { TabProps, getGlassStyle } from '@/app/sharedTypes';
import { styles as globalStyles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { autoTranslate, translateWithGemini } from '@/services/translator';
import { useDebounce } from '@/hooks/useDebounce';
import { DateTimePicker } from '@/components/DateTimePicker';
import { Spacing } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

export function NewsletterTab({
  user,
  colors,
  t,
  showToast,
  i18n,
  initialSubTab,
  initialSelectedItemId,
  clearInitialParams
}: TabProps & {
  initialSubTab?: 'newsletters' | 'articles' | 'submit' | 'pending' | 'upload';
  initialSelectedItemId?: string | null;
  clearInitialParams?: () => void;
}) {
  const [articles, setArticles] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'newsletters' | 'articles' | 'submit' | 'pending' | 'upload'>('newsletters');
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [parentStudents, setParentStudents] = useState<any[]>([]);
  const [submitOnBehalf, setSubmitOnBehalf] = useState(false);
  const [articleAuthorStudentId, setArticleAuthorStudentId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [authorSelectionType, setAuthorSelectionType] = useState<'registered' | 'custom'>('registered');
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [customAuthorRole, setCustomAuthorRole] = useState<'student' | 'teacher' | 'parent' | 'volunteer' | 'other'>('student');
  const [customAuthorClassId, setCustomAuthorClassId] = useState('');
  
  // Newsletter Filter
  const [filterNewsletterType, setFilterNewsletterType] = useState<'All' | 'weekly' | 'monthly' | 'term' | 'yearly'>('All');

  // Submit Article Form State
  const [articleTitleEn, setArticleTitleEn] = useState('');
  const [articleTitleTa, setArticleTitleTa] = useState('');
  const [articleContentEn, setArticleContentEn] = useState('');
  const [articleContentTa, setArticleContentTa] = useState('');
  const [articleDate, setArticleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [articleMediaUri, setArticleMediaUri] = useState('');
  const [articleMediaType, setArticleMediaType] = useState<'image' | 'video'>('image');
  
  // Upload Newsletter Form State
  const [newsTitleEn, setNewsTitleEn] = useState('');
  const [newsTitleTa, setNewsTitleTa] = useState('');
  const [newsDescriptionEn, setNewsDescriptionEn] = useState('');
  const [newsDescriptionTa, setNewsDescriptionTa] = useState('');
  const [newsType, setNewsType] = useState<'weekly' | 'monthly' | 'term' | 'yearly'>('weekly');
  const [newsDate, setNewsDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newsPdfUri, setNewsPdfUri] = useState('');
  const [newsMediaUri, setNewsMediaUri] = useState('');
  const [newsMediaType, setNewsMediaType] = useState<'image' | 'video'>('image');

  // Dirty flags for translations
  const [artTitleTaDirty, setArtTitleTaDirty] = useState(false);
  const [artContentTaDirty, setArtContentTaDirty] = useState(false);
  const [newsTitleTaDirty, setNewsTitleTaDirty] = useState(false);
  const [newsDescTaDirty, setNewsDescTaDirty] = useState(false);

  // Debouncing for translation inputs
  const debouncedArtTitle = useDebounce(articleTitleEn, 700);
  const debouncedArtContent = useDebounce(articleContentEn, 850);
  const debouncedNewsTitle = useDebounce(newsTitleEn, 700);
  const debouncedNewsDesc = useDebounce(newsDescriptionEn, 850);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerItems, setPickerItems] = useState<{ label: string; value: string }[]>([]);
  const [pickerOnSelect, setPickerOnSelect] = useState<(value: string) => void>(() => {});

  const isStaff = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'volunteer';
  const isAdmin = user?.role === 'admin';

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const arts = await mockDb.getArticles();
      setArticles(arts);
      const papers = await mockDb.getNewsletters();
      setNewsletters(papers);

      const usersList = await mockDb.getUsers();
      setAllUsers(usersList);
      const clss = await mockDb.getClasses();
      setClasses(clss);

      // Fetch parent's associated children
      if (user?.role === 'parent') {
        const associatedIds = user?.associatedStudents || [];
        const associated: any[] = [];
        for (const sId of associatedIds) {
          const sObj = usersList.find((u: any) => u.uid === sId);
          if (sObj) associated.push(sObj);
        }
        setParentStudents(associated);
        if (associated.length > 0 && !articleAuthorStudentId) {
          setArticleAuthorStudentId(associated[0].uid);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load newsletter data / தரவுகளை ஏற்றுவதில் தோல்வி', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
      if (clearInitialParams) {
        clearInitialParams();
      }
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialSelectedItemId && articles.length > 0) {
      const found = articles.find(art => art.articleId === initialSelectedItemId);
      if (found) {
        setSelectedArticle(found);
      }
    }
  }, [initialSelectedItemId, articles]);

  useEffect(() => {
    loadData();
  }, [user]);

  // Translate Article Title
  useEffect(() => {
    if (artTitleTaDirty) return;
    if (!debouncedArtTitle || debouncedArtTitle.trim() === '') {
      setArticleTitleTa('');
      return;
    }
    const translate = async () => {
      try {
        const result = await translateWithGemini(debouncedArtTitle);
        setArticleTitleTa(result);
      } catch (err) {
        console.error(err);
      }
    };
    translate();
  }, [debouncedArtTitle, artTitleTaDirty]);

  // Translate Article Content
  useEffect(() => {
    if (artContentTaDirty) return;
    if (!debouncedArtContent || debouncedArtContent.trim() === '') {
      setArticleContentTa('');
      return;
    }
    const translate = async () => {
      try {
        const result = await translateWithGemini(debouncedArtContent);
        setArticleContentTa(result);
      } catch (err) {
        console.error(err);
      }
    };
    translate();
  }, [debouncedArtContent, artContentTaDirty]);

  // Translate Newsletter Title
  useEffect(() => {
    if (newsTitleTaDirty) return;
    if (!debouncedNewsTitle || debouncedNewsTitle.trim() === '') {
      setNewsTitleTa('');
      return;
    }
    const translate = async () => {
      try {
        const result = await translateWithGemini(debouncedNewsTitle);
        setNewsTitleTa(result);
      } catch (err) {
        console.error(err);
      }
    };
    translate();
  }, [debouncedNewsTitle, newsTitleTaDirty]);

  // Translate Newsletter Description
  useEffect(() => {
    if (newsDescTaDirty) return;
    if (!debouncedNewsDesc || debouncedNewsDesc.trim() === '') {
      setNewsDescriptionTa('');
      return;
    }
    const translate = async () => {
      try {
        const result = await translateWithGemini(debouncedNewsDesc);
        setNewsDescriptionTa(result);
      } catch (err) {
        console.error(err);
      }
    };
    translate();
  }, [debouncedNewsDesc, newsDescTaDirty]);

  const openCustomPicker = (title: string, items: { label: string; value: string }[], onSelect: (value: string) => void) => {
    setPickerTitle(title);
    setPickerItems(items);
    setPickerOnSelect(() => (val: string) => {
      onSelect(val);
      setPickerVisible(false);
    });
    setPickerVisible(true);
  };

  // Simulated media upload helper
  const handleMediaUpload = async (type: 'image' | 'video', target: 'article' | 'newsletter') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access photo library is required / புகைப்பட அணுகல் அனுமதி தேவை', 'warning');
        return;
      }
      const mediaTypes = type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 0.7,
        allowsEditing: false
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (target === 'article') {
          setArticleMediaUri(uri);
          setArticleMediaType(type);
        } else {
          setNewsMediaUri(uri);
          setNewsMediaType(type);
        }
        showToast('File selected / கோப்பு தேர்ந்தெடுக்கப்பட்டது', 'success');
      }
    } catch (e) {
      console.warn('Native picker failed, using mock data:', e);
      // Simulated fallback
      const mockUri = type === 'image' 
        ? 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800'
        : 'https://www.w3schools.com/html/mov_bbb.mp4';
      if (target === 'article') {
        setArticleMediaUri(mockUri);
        setArticleMediaType(type);
      } else {
        setNewsMediaUri(mockUri);
        setNewsMediaType(type);
      }
      showToast('Simulated media attached / மாதிரி ஊடகம் இணைக்கப்பட்டது', 'success');
    }
  };

  const handlePdfUpload = () => {
    // Simulated PDF selection
    const mockPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    setNewsPdfUri(mockPdf);
    showToast('PDF file selected / PDF கோப்பு தேர்ந்தெடுக்கப்பட்டது', 'success');
  };

  const handleStartEditArticle = (art: any) => {
    setEditingArticle(art);
    setArticleTitleEn(art.title);
    setArticleTitleTa(art.titleTa || '');
    setArticleContentEn(art.content);
    setArticleContentTa(art.contentTa || '');
    setArticleDate(art.dateSubmitted || new Date().toISOString().split('T')[0]);
    setArticleMediaUri(art.mediaUrl || '');
    setArticleMediaType(art.mediaType || 'image');
    setArtTitleTaDirty(!!art.titleTa);
    setArtContentTaDirty(!!art.contentTa);
    
    const isBehalf = (art.authorName !== user?.fullName);
    setSubmitOnBehalf(isBehalf);
    if (isBehalf) {
      if (art.authorStudentId) {
        setAuthorSelectionType('registered');
        setArticleAuthorStudentId(art.authorStudentId);
      } else {
        setAuthorSelectionType('custom');
        setCustomAuthorName(art.authorName);
        setCustomAuthorRole(art.authorRole || 'student');
        const matchingClass = classes.find(c => c.className === art.authorClass);
        setCustomAuthorClassId(matchingClass ? matchingClass.classId : '');
      }
    } else {
      setAuthorSelectionType('registered');
      setArticleAuthorStudentId(user?.uid || '');
    }
    setActiveSubTab('submit');
  };

  const handleCancelEditArticle = () => {
    setEditingArticle(null);
    setArticleTitleEn('');
    setArticleTitleTa('');
    setArticleContentEn('');
    setArticleContentTa('');
    setArticleMediaUri('');
    setArtTitleTaDirty(false);
    setArtContentTaDirty(false);
    setSubmitOnBehalf(false);
    setAuthorSelectionType('registered');
    setCustomAuthorName('');
    setCustomAuthorRole('student');
    setCustomAuthorClassId('');
    if (parentStudents.length > 0) {
      setArticleAuthorStudentId(parentStudents[0].uid);
    } else {
      setArticleAuthorStudentId('');
    }
    setActiveSubTab('articles');
  };

  // Submit Article (handles both Create and Update)
  const handleSubmitArticle = async () => {
    if (!articleTitleEn || !articleTitleTa || !articleContentEn || !articleContentTa) {
      showToast('Please fill out all title and content fields / அனைத்து தலைப்பு மற்றும் குறிப்பு விவரங்களையும் நிரப்பவும்', 'warning');
      return;
    }
    setLoading(true);
    try {
      const resolveUserClass = (userId: string, role: string) => {
        if (role === 'student') {
          const cls = classes.find(c => c.studentIds?.includes(userId));
          return cls ? cls.className : undefined;
        } else if (role === 'teacher') {
          const cls = classes.find(c => c.teacherId === userId);
          return cls ? cls.className : undefined;
        } else if (role === 'volunteer') {
          const cls = classes.find(c => c.volunteerIds?.includes(userId));
          return cls ? cls.className : undefined;
        }
        return undefined;
      };

      let finalAuthorName = user?.fullName || 'Anonymous';
      let finalAuthorRole = user?.role || 'parent';
      let finalAuthorStudentId: string | undefined = undefined;
      let finalAuthorClass: string | undefined = undefined;

      const isStaffOrParent = isStaff || user?.role === 'parent';
      if (isStaffOrParent && submitOnBehalf) {
        if (authorSelectionType === 'registered') {
          const selectedUserObj = allUsers.find(u => u.uid === articleAuthorStudentId);
          if (selectedUserObj) {
            finalAuthorName = selectedUserObj.fullName;
            finalAuthorRole = selectedUserObj.role;
            finalAuthorStudentId = selectedUserObj.uid;
            finalAuthorClass = resolveUserClass(selectedUserObj.uid, selectedUserObj.role);
          }
        } else {
          finalAuthorName = customAuthorName || 'Anonymous';
          finalAuthorRole = customAuthorRole;
          if (customAuthorClassId) {
            const cls = classes.find(c => c.classId === customAuthorClassId);
            finalAuthorClass = cls ? cls.className : undefined;
          }
        }
      } else {
        finalAuthorClass = resolveUserClass(user?.uid || '', user?.role || '');
      }

      if (editingArticle) {
        await mockDb.updateArticle(editingArticle.articleId, {
          title: articleTitleEn,
          titleTa: articleTitleTa,
          content: articleContentEn,
          contentTa: articleContentTa,
          mediaUri: articleMediaUri || undefined,
          mediaType: articleMediaUri ? articleMediaType : undefined,
          dateSubmitted: articleDate,
          authorName: finalAuthorName,
          authorRole: finalAuthorRole,
          authorStudentId: finalAuthorStudentId,
          authorClass: finalAuthorClass,
          status: isStaff ? editingArticle.status : 'pending' // Parents/students edits go back to pending review
        });
        showToast('Article updated successfully / கட்டுரை வெற்றிகரமாக புதுப்பிக்கப்பட்டது', 'success');
        setEditingArticle(null);
      } else {
        await mockDb.createArticle({
          title: articleTitleEn,
          titleTa: articleTitleTa,
          content: articleContentEn,
          contentTa: articleContentTa,
          mediaUri: articleMediaUri || undefined,
          mediaType: articleMediaUri ? articleMediaType : undefined,
          submittedBy: user?.uid || 'unknown',
          authorName: finalAuthorName,
          authorRole: finalAuthorRole,
          authorStudentId: finalAuthorStudentId,
          authorClass: finalAuthorClass,
          dateSubmitted: articleDate,
          status: 'pending' // Send to volunteers/teachers for approval when uploaded
        });
        showToast('Article submitted for review / கட்டுரை சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டது', 'success');
      }
      
      // Reset Form
      setArticleTitleEn('');
      setArticleTitleTa('');
      setArticleContentEn('');
      setArticleContentTa('');
      setArticleMediaUri('');
      setArtTitleTaDirty(false);
      setArtContentTaDirty(false);
      setSubmitOnBehalf(false);
      setAuthorSelectionType('registered');
      setCustomAuthorName('');
      setCustomAuthorRole('student');
      setCustomAuthorClassId('');
      if (parentStudents.length > 0) {
        setArticleAuthorStudentId(parentStudents[0].uid);
      } else {
        setArticleAuthorStudentId('');
      }
      setActiveSubTab('articles');
      loadData();
    } catch (e) {
      showToast('Failed to save article / கட்டுரையைச் சேமிக்க முடியவில்லை', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload Newsletter
  const handleUploadNewsletter = async () => {
    if (!newsTitleEn || !newsTitleTa || !newsDescriptionEn || !newsDescriptionTa || !newsPdfUri) {
      showToast('Please fill out all newsletter fields and select a PDF / அனைத்து விவரங்களையும் பூர்த்தி செய்து PDF கோப்பைத் தேர்ந்தெடுக்கவும்', 'warning');
      return;
    }
    setLoading(true);
    try {
      await mockDb.createNewsletter({
        title: newsTitleEn,
        titleTa: newsTitleTa,
        type: newsType,
        description: newsDescriptionEn,
        descriptionTa: newsDescriptionTa,
        dateCreated: newsDate,
        uploadedBy: user?.uid || 'unknown',
        uploaderName: user?.fullName || 'Staff Member',
        pdfUri: newsPdfUri,
        mediaUri: newsMediaUri || undefined,
        mediaType: newsMediaUri ? newsMediaType : undefined
      });
      showToast('Newsletter uploaded successfully / செய்திமடல் வெற்றிகரமாக பதிவேற்றப்பட்டது', 'success');
      
      // Reset Form
      setNewsTitleEn('');
      setNewsTitleTa('');
      setNewsDescriptionEn('');
      setNewsDescriptionTa('');
      setNewsPdfUri('');
      setNewsMediaUri('');
      setNewsTitleTaDirty(false);
      setNewsDescTaDirty(false);
      
      setActiveSubTab('newsletters');
      loadData();
    } catch (e) {
      showToast('Failed to upload newsletter / செய்திமடலை பதிவேற்ற முடியவில்லை', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveArticle = async (id: string) => {
    try {
      await mockDb.approveArticle(id, user?.fullName || 'Staff Member');
      showToast('Article approved successfully / கட்டுரை அங்கீகரிக்கப்பட்டது', 'success');
      loadData();
    } catch (e) {
      showToast('Approval failed / அங்கீகாரம் தோல்வியடைந்தது', 'error');
    }
  };

  const handleRejectArticle = async (id: string) => {
    try {
      await mockDb.rejectArticle(id);
      showToast('Article rejected / கட்டுரை நிராகரிக்கப்பட்டது', 'success');
      loadData();
    } catch (e) {
      showToast('Rejection failed / நிராகரிப்பு தோல்வியடைந்தது', 'error');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await mockDb.deleteArticle(id);
      showToast('Article deleted / கட்டுரை நீக்கப்பட்டது', 'success');
      loadData();
    } catch (e) {
      showToast('Deletion failed / நீக்குதல் தோல்வியடைந்தது', 'error');
    }
  };

  const handleDeleteNewsletter = async (id: string) => {
    try {
      await mockDb.deleteNewsletter(id);
      showToast('Newsletter deleted / செய்திமடல் நீக்கப்பட்டது', 'success');
      loadData();
    } catch (e) {
      showToast('Deletion failed / நீக்குதல் தோல்வியடைந்தது', 'error');
    }
  };

  const handleOpenPdf = async (url: string) => {
    if (!url) return;
    try {
      await openBrowserAsync(url);
    } catch (error) {
      Linking.openURL(url).catch((err) => {
        showToast('Unable to open newsletter link / கோப்பைத் திறக்க முடியவில்லை', 'error');
      });
    }
  };

  // Filter newsletters
  const filteredNewsletters = newsletters.filter(paper => {
    return filterNewsletterType === 'All' || paper.type === filterNewsletterType;
  });

  // Filter articles
  const approvedArticles = articles.filter(art => {
    if (art.status === 'approved') return true;
    return art.submittedBy === user?.uid;
  });
  const pendingArticles = articles.filter(art => art.status === 'pending');

  const pendingCount = pendingArticles.length;

  return (
    <View style={globalStyles.tabContentWrapper}>
      {/* Title Header */}
      <View style={{ marginBottom: Spacing.three }}>
        <ThemedText style={globalStyles.sectionTitle}>
          {i18n.language === 'ta' ? 'செய்திமடல்கள் & கட்டுரைகள்' : 'Newsletters & Articles'}
        </ThemedText>
        <ThemedText style={[globalStyles.sectionSubtitle, { color: colors.textSecondary }]}>
          {i18n.language === 'ta'
            ? 'பள்ளியின் செய்திமடல்களைக் காணவும், மாணவர்கள் மற்றும் பெற்றோர்களின் படைப்பு கட்டுரைகளைச் சமர்ப்பிக்கவும்'
            : 'Explore newsletters and read or submit creative literary articles by parents, students, and staff'}
        </ThemedText>
      </View>

      {/* Sub tabs Navigation */}
      <View style={[localStyles.subTabBar, { borderColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveSubTab('newsletters')}
          style={[
            localStyles.subTabBarItem,
            activeSubTab === 'newsletters' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
        >
          <ThemedText style={[
            localStyles.subTabItemText,
            { color: activeSubTab === 'newsletters' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'newsletters' ? '700' : '500' }
          ]}>
            {i18n.language === 'ta' ? 'செய்திமடல்கள்' : 'Newsletters'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveSubTab('articles')}
          style={[
            localStyles.subTabBarItem,
            activeSubTab === 'articles' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
        >
          <ThemedText style={[
            localStyles.subTabItemText,
            { color: activeSubTab === 'articles' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'articles' ? '700' : '500' }
          ]}>
            {i18n.language === 'ta' ? 'கட்டுரைகள்' : 'Articles'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            if (activeSubTab !== 'submit') {
              setEditingArticle(null);
              setArticleTitleEn('');
              setArticleTitleTa('');
              setArticleContentEn('');
              setArticleContentTa('');
              setArticleMediaUri('');
              setArtTitleTaDirty(false);
              setArtContentTaDirty(false);
            }
            setActiveSubTab('submit');
          }}
          style={[
            localStyles.subTabBarItem,
            activeSubTab === 'submit' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
        >
          <ThemedText style={[
            localStyles.subTabItemText,
            { color: activeSubTab === 'submit' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'submit' ? '700' : '500' }
          ]}>
            {i18n.language === 'ta' ? 'கட்டுரை சமர்ப்பி' : 'Submit Article'}
          </ThemedText>
        </Pressable>

        {isStaff && (
          <Pressable
            onPress={() => setActiveSubTab('pending')}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'pending' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ThemedText style={[
                localStyles.subTabItemText,
                { color: activeSubTab === 'pending' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'pending' ? '700' : '500' }
              ]}>
                {i18n.language === 'ta' ? 'சரிபார்ப்பு' : 'Approvals'}
              </ThemedText>
              {pendingCount > 0 && (
                <View style={[localStyles.badgeCount, { backgroundColor: colors.danger }]}>
                  <ThemedText style={localStyles.badgeCountText}>{pendingCount}</ThemedText>
                </View>
              )}
            </View>
          </Pressable>
        )}

        {isStaff && (
          <Pressable
            onPress={() => setActiveSubTab('upload')}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'upload' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={14} color={activeSubTab === 'upload' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                localStyles.subTabItemText,
                { color: activeSubTab === 'upload' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'upload' ? '700' : '500' }
              ]}>
                {i18n.language === 'ta' ? 'பதிவேற்று' : 'Upload'}
              </ThemedText>
            </View>
          </Pressable>
        )}
      </View>

      {/* Main Tab Screens */}
      {loading ? (
        <View style={localStyles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeSubTab === 'newsletters' ? (
        /* NEWSLETTERS LIST SCREEN */
        <View style={{ flex: 1 }}>
          {/* Newsletter Type Filter */}
          <View style={[localStyles.filtersRow, { borderColor: colors.border }]}>
            <Pressable
              onPress={() => {
                const items = [
                  { label: i18n.language === 'ta' ? 'அனைத்து செய்திமடல்களும்' : 'All Newsletters', value: 'All' },
                  { label: i18n.language === 'ta' ? 'வாராந்திர செய்திமடல்' : 'Weekly Newsletter', value: 'weekly' },
                  { label: i18n.language === 'ta' ? 'மாதாந்திர செய்திமடல்' : 'Monthly Newsletter', value: 'monthly' },
                  { label: i18n.language === 'ta' ? 'பருவ செய்திமடல்' : 'Term Newsletter', value: 'term' },
                  { label: i18n.language === 'ta' ? 'ஆண்டு செய்திமடல்' : 'Yearly Newsletter', value: 'yearly' }
                ];
                openCustomPicker(
                  i18n.language === 'ta' ? 'செய்திமடல் வகை' : 'Newsletter Type',
                  items,
                  (val) => setFilterNewsletterType(val as any)
                );
              }}
              style={[localStyles.filterSelect, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            >
              <Filter size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <ThemedText style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                {filterNewsletterType === 'All'
                  ? (i18n.language === 'ta' ? 'வகை: அனைத்தும்' : 'Type: All')
                  : `Type: ${filterNewsletterType.toUpperCase()}`}
              </ThemedText>
              <ChevronDown size={14} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: Spacing.three, paddingBottom: 120 }}>
            {filteredNewsletters.length === 0 ? (
              <View style={[localStyles.emptyContainer, { borderColor: colors.border }]}>
                <Newspaper size={48} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: Spacing.two }} />
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  {i18n.language === 'ta' ? 'செய்திமடல்கள் எதுவும் இல்லை.' : 'No newsletters found.'}
                </ThemedText>
              </View>
            ) : (
              filteredNewsletters.map((paper) => {
                const titleText = i18n.language === 'ta' && paper.titleTa ? paper.titleTa : paper.title;
                const descText = i18n.language === 'ta' && paper.descriptionTa ? paper.descriptionTa : paper.description;
                return (
                  <View
                    key={paper.newsletterId}
                    style={[
                      localStyles.card,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      getGlassStyle(colors.cardBg, colors.border === '#2E332A', 0.8)
                    ]}
                  >
                    <View style={localStyles.cardHeader}>
                      <View>
                        <ThemedText style={[localStyles.cardTitle, { color: colors.text }]}>{titleText}</ThemedText>
                        <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                          {i18n.language === 'ta' 
                            ? `${paper.type.toUpperCase()} • வெளியீடு: ${paper.dateCreated} • பதிவேற்றியவர்: ${paper.uploaderName}` 
                            : `${paper.type.toUpperCase()} • Released: ${paper.dateCreated} • Uploaded by: ${paper.uploaderName}`}
                        </ThemedText>
                      </View>
                      {isStaff && (
                        <Pressable
                          onPress={() => handleDeleteNewsletter(paper.newsletterId)}
                          style={{ padding: 6, borderRadius: 6, backgroundColor: colors.danger + '10' }}
                        >
                          <Trash2 size={16} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>

                    <ThemedText style={[localStyles.cardDesc, { color: colors.textSecondary }]}>
                      {descText}
                    </ThemedText>

                    {paper.pdfUrl && (
                      <Pressable
                        onPress={() => handleOpenPdf(paper.pdfUrl)}
                        style={[localStyles.actionButton, { backgroundColor: colors.primary, marginTop: Spacing.two }]}
                      >
                        <FileText size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <ThemedText style={localStyles.actionButtonText}>
                          {i18n.language === 'ta' ? 'செய்திமடல் வாசிக்க (PDF)' : 'Read Newsletter (PDF)'}
                        </ThemedText>
                        <ExternalLink size={14} color="#FFF" style={{ marginLeft: 'auto' }} />
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : activeSubTab === 'articles' ? (
        /* ARTICLES LIST SCREEN */
        <ScrollView contentContainerStyle={{ gap: Spacing.three, paddingBottom: 120 }}>
          {approvedArticles.length === 0 ? (
            <View style={[localStyles.emptyContainer, { borderColor: colors.border }]}>
              <Newspaper size={48} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: Spacing.two }} />
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {i18n.language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கட்டுரைகள் எதுவும் இல்லை.' : 'No articles published yet.'}
              </ThemedText>
            </View>
          ) : (
            approvedArticles.map((art) => {
              const titleText = i18n.language === 'ta' && art.titleTa ? art.titleTa : art.title;
              const contentText = i18n.language === 'ta' && art.contentTa ? art.contentTa : art.content;
              return (
                <View
                  key={art.articleId}
                  style={[
                    localStyles.card,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                    getGlassStyle(colors.cardBg, colors.border === '#2E332A', 0.8)
                  ]}
                >
                  <View style={localStyles.cardHeader}>
                    <View>
                      <ThemedText style={[localStyles.cardTitle, { color: colors.text }]}>{titleText}</ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                        {i18n.language === 'ta'
                          ? `எழுதியவர்: ${art.authorName} (${art.authorRole.toUpperCase()}${art.authorClass ? ` • ${art.authorClass}` : ''}) • தேதி: ${art.dateSubmitted}`
                          : `Author: ${art.authorName} (${art.authorRole.toUpperCase()}${art.authorClass ? ` • ${art.authorClass}` : ''}) • Date: ${art.dateSubmitted}`}
                      </ThemedText>
                      {art.status !== 'approved' && (
                        <View style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: art.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                          marginTop: 6
                        }}>
                          <ThemedText style={{
                            fontSize: 9,
                            fontWeight: '700',
                            color: art.status === 'pending' ? '#D97706' : '#DC2626'
                          }}>
                            {art.status === 'pending'
                              ? (i18n.language === 'ta' ? 'சரிபார்ப்பில் உள்ளது' : 'Pending Approval')
                              : (i18n.language === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Rejected')}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    {(isStaff || art.submittedBy === user?.uid) && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable
                          onPress={() => handleStartEditArticle(art)}
                          style={{ padding: 6, borderRadius: 6, backgroundColor: colors.primary + '10' }}
                        >
                          <Edit2 size={14} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteArticle(art.articleId)}
                          style={{ padding: 6, borderRadius: 6, backgroundColor: colors.danger + '10' }}
                        >
                          <Trash2 size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  <ThemedText 
                    style={[localStyles.cardDesc, { color: colors.textSecondary, lineHeight: 18 }]}
                    numberOfLines={3}
                  >
                    {contentText}
                  </ThemedText>

                  <Pressable 
                    onPress={() => setSelectedArticle(art)}
                    style={{ marginTop: 6, marginBottom: 4, alignSelf: 'flex-start' }}
                  >
                    <ThemedText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      {i18n.language === 'ta' ? 'மேலும் வாசிக்க...' : 'Read More...'}
                    </ThemedText>
                  </Pressable>

                  {art.mediaUrl && (
                    art.mediaType === 'video' ? (
                      <VideoPlayer 
                        url={art.mediaUrl} 
                        style={{ height: 200, borderRadius: 12, overflow: 'hidden', marginTop: Spacing.two }} 
                      />
                    ) : (
                      <Pressable 
                        onPress={() => setSelectedArticle(art)}
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          borderRadius: 12, 
                          marginTop: Spacing.two, 
                          overflow: 'hidden', 
                          backgroundColor: '#0c0c0c',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Image 
                          source={{ uri: art.mediaUrl }} 
                          style={{ width: '100%', height: '100%' }} 
                          resizeMode="contain"
                        />
                      </Pressable>
                    )
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : activeSubTab === 'submit' ? (
        /* SUBMIT ARTICLE FORM */
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[localStyles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Sparkles size={20} color={colors.primary} />
              <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                {i18n.language === 'ta' ? 'புதிய கட்டுரை சமர்ப்பிக்கவும்' : 'Submit Literary Article'}
              </ThemedText>
            </View>

            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'கட்டுரைத் தலைப்பு (ஆங்கிலம்)' : 'Article Title (English)'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Enter title in English..."
                placeholderTextColor={colors.textSecondary}
                value={articleTitleEn}
                onChangeText={(text) => {
                  setArticleTitleEn(text);
                  setArtTitleTaDirty(false);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'கட்டுரைத் தலைப்பு (தமிழ்)' : 'Article Title (Tamil - Auto-translated)'}
                </ThemedText>
                {articleTitleTa ? (
                  <Pressable onPress={() => setArtTitleTaDirty(true)}>
                    <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                      {artTitleTaDirty ? '✓ Manually Edited' : 'Edit Translation'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="தமிழ் தலைப்பு..."
                placeholderTextColor={colors.textSecondary}
                value={articleTitleTa}
                onChangeText={(text) => {
                  setArticleTitleTa(text);
                  setArtTitleTaDirty(true);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'கட்டுரை உள்ளடக்கம் (ஆங்கிலம்)' : 'Article Content (English)'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border, height: 100, textAlignVertical: 'top' }]}
                placeholder="Write your article in English here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={5}
                value={articleContentEn}
                onChangeText={(text) => {
                  setArticleContentEn(text);
                  setArtContentTaDirty(false);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'கட்டுரை உள்ளடக்கம் (தமிழ்)' : 'Article Content (Tamil - Auto-translated)'}
                </ThemedText>
                {articleContentTa ? (
                  <Pressable onPress={() => setArtContentTaDirty(true)}>
                    <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                      {artContentTaDirty ? '✓ Manually Edited' : 'Edit Translation'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border, height: 100, textAlignVertical: 'top' }]}
                placeholder="தமிழ் உள்ளடக்கம்..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={5}
                value={articleContentTa}
                onChangeText={(text) => {
                  setArticleContentTa(text);
                  setArtContentTaDirty(true);
                }}
              />
            </View>

            {/* Date Submitted Picker */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'தேதி' : 'Date Submitted'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <DateTimePicker
                value={articleDate}
                onChange={setArticleDate}
                colors={colors}
              />
            </View>

            {/* Media Upload Buttons */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'புகைப்படம் அல்லது காணொளி இணைக்கவும் (தேவையின் பேரில்)' : 'Attach Image or Video (Optional)'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Pressable
                  onPress={() => handleMediaUpload('image', 'article')}
                  style={[localStyles.mediaSelectBtn, { borderColor: colors.border }]}
                >
                  <ImageIcon size={18} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12 }}>{i18n.language === 'ta' ? 'புகைப்படம்' : 'Photo'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleMediaUpload('video', 'article')}
                  style={[localStyles.mediaSelectBtn, { borderColor: colors.border }]}
                >
                  <VideoIcon size={18} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12 }}>{i18n.language === 'ta' ? 'காணொளி' : 'Video'}</ThemedText>
                </Pressable>
              </View>

              {articleMediaUri ? (
                <View style={[localStyles.attachmentPreviewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {articleMediaType === 'video' ? <VideoIcon size={16} color={colors.primary} /> : <ImageIcon size={16} color={colors.primary} />}
                  <ThemedText style={{ fontSize: 12, flex: 1, marginLeft: 6 }} numberOfLines={1}>
                    {articleMediaUri.split('/').pop()?.split('?')[0] || 'Selected Media'}
                  </ThemedText>
                  <Pressable onPress={() => setArticleMediaUri('')}>
                    <X size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Optional: Submit on behalf of child / someone else */}
            {((user?.role === 'parent' && parentStudents.length > 0) || isStaff) && (
              <View style={{ gap: Spacing.two, marginBottom: Spacing.three, marginTop: Spacing.one }}>
                <Pressable
                  onPress={() => {
                    const nextVal = !submitOnBehalf;
                    setSubmitOnBehalf(nextVal);
                    if (nextVal && isStaff && allUsers.length > 0 && !articleAuthorStudentId) {
                      setArticleAuthorStudentId(allUsers[0].uid);
                    }
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
                >
                  <View style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: submitOnBehalf ? colors.primary : colors.border,
                    backgroundColor: submitOnBehalf ? colors.primary : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {submitOnBehalf && <Check size={12} color="#FFF" />}
                  </View>
                  <ThemedText style={{ fontSize: 13, color: colors.text }}>
                    {user?.role === 'parent'
                      ? (i18n.language === 'ta' ? 'குழந்தையின் சார்பில் சமர்ப்பிக்கவும்' : 'Submit on behalf of my child')
                      : (i18n.language === 'ta' ? 'வேறொருவர் சார்பில் சமர்ப்பிக்கவும்' : 'Submit on behalf of someone else')}
                  </ThemedText>
                </Pressable>

                {submitOnBehalf && (
                  <View style={{ gap: 12, marginTop: 4 }}>
                    {/* For Staff: Selector for Registered vs Custom */}
                    {isStaff && (
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                        <Pressable
                          onPress={() => setAuthorSelectionType('registered')}
                          style={({ pressed }) => [
                            {
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: authorSelectionType === 'registered' ? colors.primary : colors.border,
                              backgroundColor: authorSelectionType === 'registered' ? colors.primaryLight : 'transparent',
                              alignItems: 'center'
                            },
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <ThemedText style={{ fontSize: 12, color: authorSelectionType === 'registered' ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
                            {i18n.language === 'ta' ? 'பதிவுசெய்த பயனர்' : 'Registered User'}
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={() => setAuthorSelectionType('custom')}
                          style={({ pressed }) => [
                            {
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: authorSelectionType === 'custom' ? colors.primary : colors.border,
                              backgroundColor: authorSelectionType === 'custom' ? colors.primaryLight : 'transparent',
                              alignItems: 'center'
                            },
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <ThemedText style={{ fontSize: 12, color: authorSelectionType === 'custom' ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
                            {i18n.language === 'ta' ? 'தனிப்பயன் பெயர்' : 'Custom Name'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    )}

                    {/* Author selection/input body */}
                    {user?.role === 'parent' || authorSelectionType === 'registered' ? (
                      /* Registered User Picker */
                      <View style={localStyles.formGroup}>
                        <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                          {user?.role === 'parent'
                            ? (i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Select Author (Child)')
                            : (i18n.language === 'ta' ? 'ஆசிரியரைத் தேர்ந்தெடுக்கவும்' : 'Select Registered Author')}
                          <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                        </ThemedText>
                        <Pressable
                          onPress={() => {
                            const options = user?.role === 'parent'
                              ? parentStudents.map(s => ({ label: s.fullName, value: s.uid }))
                              : allUsers.map(u => ({ label: `${u.fullName} (${u.role.toUpperCase()})`, value: u.uid }));
                            openCustomPicker(
                              user?.role === 'parent'
                                ? (i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Select Child')
                                : (i18n.language === 'ta' ? 'ஆசிரியரைத் தேர்ந்தெடுக்கவும்' : 'Select Author'),
                              options,
                              setArticleAuthorStudentId
                            );
                          }}
                          style={[localStyles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                        >
                          <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                            {user?.role === 'parent'
                              ? (parentStudents.find(s => s.uid === articleAuthorStudentId)?.fullName || (i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Select Child'))
                              : (allUsers.find(u => u.uid === articleAuthorStudentId)?.fullName ? `${allUsers.find(u => u.uid === articleAuthorStudentId)?.fullName} (${allUsers.find(u => u.uid === articleAuthorStudentId)?.role.toUpperCase()})` : (i18n.language === 'ta' ? 'ஆசிரியரைத் தேர்ந்தெடுக்கவும்' : 'Select Author'))}
                          </ThemedText>
                          <ChevronDown size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    ) : (
                      /* Custom Author Form Fields */
                      <View style={{ gap: 12 }}>
                        {/* Custom Name */}
                        <View style={localStyles.formGroup}>
                          <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                            {i18n.language === 'ta' ? 'ஆசிரியர் பெயர்' : 'Author Name'}
                            <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                          </ThemedText>
                          <TextInput
                            style={[localStyles.textInput, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter author's name..."
                            placeholderTextColor={colors.textSecondary}
                            value={customAuthorName}
                            onChangeText={setCustomAuthorName}
                          />
                        </View>

                        {/* Custom Role */}
                        <View style={localStyles.formGroup}>
                          <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                            {i18n.language === 'ta' ? 'பங்கு' : 'Author Role'}
                            <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                          </ThemedText>
                          <Pressable
                            onPress={() => {
                              const roles = [
                                { label: 'Student', value: 'student' },
                                { label: 'Teacher', value: 'teacher' },
                                { label: 'Parent', value: 'parent' },
                                { label: 'Volunteer', value: 'volunteer' },
                                { label: 'Other', value: 'other' }
                              ];
                              openCustomPicker(
                                i18n.language === 'ta' ? 'பங்கு' : 'Select Role',
                                roles,
                                (val) => setCustomAuthorRole(val as any)
                              );
                            }}
                            style={[localStyles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                          >
                            <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1, textTransform: 'uppercase' }}>
                              {customAuthorRole}
                            </ThemedText>
                            <ChevronDown size={16} color={colors.textSecondary} />
                          </Pressable>
                        </View>

                        {/* Custom Class */}
                        {(customAuthorRole === 'student' || customAuthorRole === 'teacher') && (
                          <View style={localStyles.formGroup}>
                            <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                              {i18n.language === 'ta' ? 'வகுப்பு (தேவையின் பேரில்)' : 'Author Class/Standard (Optional)'}
                            </ThemedText>
                            <Pressable
                              onPress={() => {
                                const classOptions = classes.map(c => ({ label: c.className, value: c.classId }));
                                const options = [{ label: 'None / எதுவும் இல்லை', value: '' }, ...classOptions];
                                openCustomPicker(
                                  i18n.language === 'ta' ? 'வகுப்பு' : 'Select Class',
                                  options,
                                  setCustomAuthorClassId
                                );
                              }}
                              style={[localStyles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                            >
                              <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                                {classes.find(c => c.classId === customAuthorClassId)?.className || 'None / எதுவும் இல்லை'}
                              </ThemedText>
                              <ChevronDown size={16} color={colors.textSecondary} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <Pressable
              onPress={handleSubmitArticle}
              style={[localStyles.actionButton, { backgroundColor: colors.primary, marginTop: Spacing.two }]}
            >
              <ThemedText style={localStyles.actionButtonText}>
                {editingArticle
                  ? (i18n.language === 'ta' ? 'மாற்றங்களைச் சேமி' : 'Save Changes')
                  : (i18n.language === 'ta' ? 'கட்டுரையைச் சமர்ப்பி' : 'Submit Article')}
              </ThemedText>
            </Pressable>

            {editingArticle && (
              <Pressable
                onPress={handleCancelEditArticle}
                style={[localStyles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: Spacing.two }]}
              >
                <ThemedText style={[localStyles.actionButtonText, { color: colors.text }]}>
                  {i18n.language === 'ta' ? 'ரத்துசெய்' : 'Cancel'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      ) : activeSubTab === 'pending' ? (
        /* PENDING APPROVALS LIST SCREEN */
        <ScrollView contentContainerStyle={{ gap: Spacing.three, paddingBottom: 120 }}>
          {pendingArticles.length === 0 ? (
            <View style={[localStyles.emptyContainer, { borderColor: colors.border }]}>
              <Clock size={48} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: Spacing.two }} />
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {i18n.language === 'ta' ? 'சரிபார்ப்புக்கு கட்டுரைகள் எதுவும் இல்லை.' : 'No articles pending approvals.'}
              </ThemedText>
            </View>
          ) : (
            pendingArticles.map((art) => {
              const titleText = i18n.language === 'ta' && art.titleTa ? art.titleTa : art.title;
              const contentText = i18n.language === 'ta' && art.contentTa ? art.contentTa : art.content;
              return (
                <View
                  key={art.articleId}
                  style={[
                    localStyles.card,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                    getGlassStyle(colors.cardBg, colors.border === '#2E332A', 0.8)
                  ]}
                >
                  <View style={localStyles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[localStyles.cardTitle, { color: colors.text }]}>{titleText}</ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                        {i18n.language === 'ta'
                          ? `சமர்ப்பித்தவர்: ${art.authorName} (${art.authorRole.toUpperCase()}${art.authorClass ? ` • ${art.authorClass}` : ''}) • தேதி: ${art.dateSubmitted}`
                          : `Submitted by: ${art.authorName} (${art.authorRole.toUpperCase()}${art.authorClass ? ` • ${art.authorClass}` : ''}) • Date: ${art.dateSubmitted}`}
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => handleStartEditArticle(art)}
                        style={{ padding: 6, borderRadius: 6, backgroundColor: colors.primary + '10' }}
                      >
                        <Edit2 size={14} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteArticle(art.articleId)}
                        style={{ padding: 6, borderRadius: 6, backgroundColor: colors.danger + '10' }}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>

                  <ThemedText 
                    style={[localStyles.cardDesc, { color: colors.textSecondary, lineHeight: 18 }]}
                    numberOfLines={3}
                  >
                    {contentText}
                  </ThemedText>

                  <Pressable 
                    onPress={() => setSelectedArticle(art)}
                    style={{ marginTop: 6, marginBottom: 4, alignSelf: 'flex-start' }}
                  >
                    <ThemedText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      {i18n.language === 'ta' ? 'மேலும் வாசிக்க...' : 'Read More...'}
                    </ThemedText>
                  </Pressable>

                  {art.mediaUrl && (
                    art.mediaType === 'video' ? (
                      <VideoPlayer 
                        url={art.mediaUrl} 
                        style={{ height: 200, borderRadius: 12, overflow: 'hidden', marginTop: Spacing.two }} 
                      />
                    ) : (
                      <Pressable 
                        onPress={() => setSelectedArticle(art)}
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          borderRadius: 12, 
                          marginTop: Spacing.two, 
                          overflow: 'hidden', 
                          backgroundColor: '#0c0c0c',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Image 
                          source={{ uri: art.mediaUrl }} 
                          style={{ width: '100%', height: '100%' }} 
                          resizeMode="contain"
                        />
                      </Pressable>
                    )
                  )}

                  {/* Approve / Reject Buttons */}
                  <View style={[localStyles.actionRow, { borderTopColor: colors.border, marginTop: Spacing.two }]}>
                    <Pressable
                      onPress={() => handleApproveArticle(art.articleId)}
                      style={[localStyles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
                    >
                      <Check size={14} color={colors.success} />
                      <ThemedText style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>
                        {i18n.language === 'ta' ? 'அனுமதி' : 'Approve'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRejectArticle(art.articleId)}
                      style={[localStyles.actionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger }]}
                    >
                      <X size={14} color={colors.danger} />
                      <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                        {i18n.language === 'ta' ? 'நிராகரி' : 'Reject'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* UPLOAD NEWSLETTER SCREEN (Staff Only) */
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[localStyles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Newspaper size={20} color={colors.primary} />
              <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                {i18n.language === 'ta' ? 'புதிய செய்திமடல் பதிவேற்றவும்' : 'Upload Newsletter Edition'}
              </ThemedText>
            </View>

            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'செய்திமடல் தலைப்பு (ஆங்கிலம்)' : 'Newsletter Title (English)'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Balar Malar Term 2 Newsletter"
                placeholderTextColor={colors.textSecondary}
                value={newsTitleEn}
                onChangeText={(text) => {
                  setNewsTitleEn(text);
                  setNewsTitleTaDirty(false);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'செய்திமடல் தலைப்பு (தமிழ்)' : 'Newsletter Title (Tamil - Auto-translated)'}
                </ThemedText>
                {newsTitleTa ? (
                  <Pressable onPress={() => setNewsTitleTaDirty(true)}>
                    <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                      {newsTitleTaDirty ? '✓ Manually Edited' : 'Edit Translation'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="செய்திமடல் தலைப்பு..."
                placeholderTextColor={colors.textSecondary}
                value={newsTitleTa}
                onChangeText={(text) => {
                  setNewsTitleTa(text);
                  setNewsTitleTaDirty(true);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'விளக்கம் (ஆங்கிலம்)' : 'Description (English)'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter quick highlights of this newsletter..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={newsDescriptionEn}
                onChangeText={(text) => {
                  setNewsDescriptionEn(text);
                  setNewsDescTaDirty(false);
                }}
              />
            </View>

            <View style={localStyles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'விளக்கம் (தமிழ்)' : 'Description (Tamil - Auto-translated)'}
                </ThemedText>
                {newsDescriptionTa ? (
                  <Pressable onPress={() => setNewsDescTaDirty(true)}>
                    <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                      {newsDescTaDirty ? '✓ Manually Edited' : 'Edit Translation'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={[localStyles.textInput, { color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
                placeholder="செய்திமடல் சுருக்கம்..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={newsDescriptionTa}
                onChangeText={(text) => {
                  setNewsDescriptionTa(text);
                  setNewsDescTaDirty(true);
                }}
              />
            </View>

            {/* Newsletter Type Dropdown */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'செய்திமடல் வகை' : 'Newsletter Periodicity'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <Pressable
                onPress={() => {
                  const types = [
                    { label: i18n.language === 'ta' ? 'வாராந்திரம்' : 'Weekly', value: 'weekly' },
                    { label: i18n.language === 'ta' ? 'மாதாந்திரம்' : 'Monthly', value: 'monthly' },
                    { label: i18n.language === 'ta' ? 'பருவம்' : 'Term', value: 'term' },
                    { label: i18n.language === 'ta' ? 'ஆண்டு' : 'Yearly', value: 'yearly' }
                  ];
                  openCustomPicker(
                    i18n.language === 'ta' ? 'வகை' : 'Select Type',
                    types,
                    (val) => setNewsType(val as any)
                  );
                }}
                style={[localStyles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                  {newsType.toUpperCase()}
                </ThemedText>
                <ChevronDown size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Date Created Picker */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'வெளியிடப்பட்ட தேதி' : 'Date Created/Released'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <DateTimePicker
                value={newsDate}
                onChange={setNewsDate}
                colors={colors}
              />
            </View>

            {/* PDF Picker */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'செய்திமடல் PDF கோப்பு' : 'Newsletter PDF Document'}
                <ThemedText style={{ color: colors.danger }}> *</ThemedText>
              </ThemedText>
              <Pressable
                onPress={handlePdfUpload}
                style={[localStyles.mediaSelectBtn, { borderColor: colors.border, width: '100%' }]}
              >
                <FileText size={18} color={colors.primary} />
                <ThemedText style={{ fontSize: 12 }}>
                  {newsPdfUri ? 'PDF Connected / PDF இணைக்கப்பட்டது' : (i18n.language === 'ta' ? 'PDF கோப்பைத் தேர்ந்தெடு' : 'Select PDF File')}
                </ThemedText>
              </Pressable>
            </View>

            {/* Optional Cover Media */}
            <View style={localStyles.formGroup}>
              <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                {i18n.language === 'ta' ? 'செய்திமடல் முகப்புப் படம் (தேவையின் பேரில்)' : 'Cover Image / Thumbnail (Optional)'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Pressable
                  onPress={() => handleMediaUpload('image', 'newsletter')}
                  style={[localStyles.mediaSelectBtn, { borderColor: colors.border }]}
                >
                  <ImageIcon size={18} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12 }}>{i18n.language === 'ta' ? 'புகைப்படம்' : 'Photo'}</ThemedText>
                </Pressable>
              </View>
              {newsMediaUri ? (
                <View style={[localStyles.attachmentPreviewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <ImageIcon size={16} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12, flex: 1, marginLeft: 6 }} numberOfLines={1}>
                    {newsMediaUri.split('/').pop()?.split('?')[0] || 'Selected Cover'}
                  </ThemedText>
                  <Pressable onPress={() => setNewsMediaUri('')}>
                    <X size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={handleUploadNewsletter}
              style={[localStyles.actionButton, { backgroundColor: colors.primary, marginTop: Spacing.two }]}
            >
              <ThemedText style={localStyles.actionButtonText}>
                {i18n.language === 'ta' ? 'செய்திமடலை பதிவேற்று' : 'Upload Newsletter'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Selected Article Detail Modal */}
      {selectedArticle && (
        <Modal
          visible={!!selectedArticle}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedArticle(null)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={[localStyles.articleModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {/* Header */}
              <View style={[localStyles.modalHeader, { borderBottomColor: colors.border }]}>
                <ThemedText style={{ fontWeight: '800', fontSize: 16, color: colors.text, flex: 1, marginRight: 12 }} numberOfLines={1}>
                  {i18n.language === 'ta' && selectedArticle.titleTa ? selectedArticle.titleTa : selectedArticle.title}
                </ThemedText>
                <Pressable onPress={() => setSelectedArticle(null)} style={{ padding: 4 }}>
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingVertical: Spacing.three, gap: Spacing.three }}>
                {/* Image/Video Display */}
                {selectedArticle.mediaUrl && (
                  selectedArticle.mediaType === 'video' ? (
                    <VideoPlayer url={selectedArticle.mediaUrl} style={{ height: 260, borderRadius: 12, overflow: 'hidden' }} />
                  ) : (
                    <View style={{ height: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0c0c0c', justifyContent: 'center', alignItems: 'center' }}>
                      <Image
                        source={{ uri: selectedArticle.mediaUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  )
                )}

                {/* Meta info */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? `எழுதியவர்: ${selectedArticle.authorName} (${selectedArticle.authorRole.toUpperCase()}${selectedArticle.authorClass ? ` • ${selectedArticle.authorClass}` : ''})`
                      : `By: ${selectedArticle.authorName} (${selectedArticle.authorRole.toUpperCase()}${selectedArticle.authorClass ? ` • ${selectedArticle.authorClass}` : ''})`}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {selectedArticle.dateSubmitted}
                  </ThemedText>
                </View>

                {/* Separator */}
                <View style={{ height: 1, backgroundColor: colors.border + '50' }} />

                {/* Titles in both languages */}
                <View style={{ gap: 4 }}>
                  {selectedArticle.titleTa && (
                    <ThemedText style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                      {selectedArticle.titleTa}
                    </ThemedText>
                  )}
                  <ThemedText style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                    {selectedArticle.title}
                  </ThemedText>
                </View>

                {/* Content in both languages */}
                <View style={{ gap: 12 }}>
                  {selectedArticle.contentTa && (
                    <ThemedText style={{ fontSize: 13, color: colors.text, lineHeight: 20, fontStyle: 'italic' }}>
                      {selectedArticle.contentTa}
                    </ThemedText>
                  )}
                  <ThemedText style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                    {selectedArticle.content}
                  </ThemedText>
                </View>

                {/* Action buttons (Approve / Reject / Edit / Delete) inside modal if applicable */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.two }}>
                  {/* If user is author or staff, allow edit/delete */}
                  {(isStaff || selectedArticle.submittedBy === user?.uid) && (
                    <>
                      <Pressable
                        onPress={() => {
                          const art = selectedArticle;
                          setSelectedArticle(null);
                          handleStartEditArticle(art);
                        }}
                        style={[localStyles.modalActionBtn, { borderColor: colors.primary, borderWidth: 1 }]}
                      >
                        <Edit2 size={14} color={colors.primary} />
                        <ThemedText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                          {i18n.language === 'ta' ? 'தொகு' : 'Edit'}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const artId = selectedArticle.articleId;
                          setSelectedArticle(null);
                          handleDeleteArticle(artId);
                        }}
                        style={[localStyles.modalActionBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger, borderWidth: 1 }]}
                      >
                        <Trash2 size={14} color={colors.danger} />
                        <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>
                          {i18n.language === 'ta' ? 'நீக்கு' : 'Delete'}
                        </ThemedText>
                      </Pressable>
                    </>
                  )}

                  {/* If pending and user is staff, allow approve/reject */}
                  {selectedArticle.status === 'pending' && isStaff && (
                    <>
                      <Pressable
                        onPress={() => {
                          const artId = selectedArticle.articleId;
                          setSelectedArticle(null);
                          handleApproveArticle(artId);
                        }}
                        style={[localStyles.modalActionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success, borderWidth: 1 }]}
                      >
                        <Check size={14} color={colors.success} />
                        <ThemedText style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
                          {i18n.language === 'ta' ? 'அனுமதி' : 'Approve'}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const artId = selectedArticle.articleId;
                          setSelectedArticle(null);
                          handleRejectArticle(artId);
                        }}
                        style={[localStyles.modalActionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger, borderWidth: 1 }]}
                      >
                        <X size={14} color={colors.danger} />
                        <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>
                          {i18n.language === 'ta' ? 'நிராகரி' : 'Reject'}
                        </ThemedText>
                      </Pressable>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Dropdown Dialog Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[localStyles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{pickerTitle}</ThemedText>
              <Pressable onPress={() => setPickerVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 200, marginVertical: Spacing.two }}>
              {pickerItems.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => pickerOnSelect(item.value)}
                  style={({ pressed }) => [
                    localStyles.pickerItemBtn,
                    { borderBottomColor: colors.border + '50', opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <ThemedText style={{ color: colors.text, fontSize: 13 }}>{item.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
    overflow: 'scroll'
  },
  subTabBarItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subTabItemText: {
    fontSize: 12,
    fontWeight: '600'
  },
  badgeCount: {
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeCountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two
  },
  filterSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    minHeight: 180
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.one
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18
  },
  mediaLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three
  },
  formGroup: {
    marginBottom: Spacing.three
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    minHeight: 40
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    height: 40
  },
  mediaSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10
  },
  attachmentPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: Spacing.two
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    gap: Spacing.two
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '90%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1
  },
  pickerItemBtn: {
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  articleModalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden'
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10
  }
});
