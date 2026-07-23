import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Image,
  Alert,
  Linking
} from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import {
  Newspaper,
  ThumbsUp,
  Heart,
  MessageSquare,
  Send,
  Mic,
  Square,
  Plus,
  ChevronRight,
  FolderOpen,
  Folder,
  File,
  ArrowLeft,
  X,
  Edit,
  Trash2,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react-native';
import { HelperTooltip } from '@/components/HelperTooltip';
import { ThemedText } from '@/components/themed-text';
import { TabProps, DriveItem, DRIVE_STRUCTURE, getCurrentFolderItems } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb, MEDIA_PRESETS } from '@/services/mockBackend';
import { autoTranslate, translateWithGemini } from '@/services/translator';
import { useDebounce } from '@/hooks/useDebounce';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Spacing } from '@/constants/theme';
import { getLocalStorageItem, setLocalStorageItem } from '@/services/dbCommon';
import * as ImagePicker from 'expo-image-picker';

// windowWidth is fetched reactively inside NewsfeedTab using useWindowDimensions()

const HERO_SLIDES = [
  {
    image: require('../../../assets/images/tamil_kids_classroom.png'),
    titleEn: 'Preserving Tamil Culture & Heritage',
    titleTa: 'தமிழ் பண்பாடு மற்றும் பாரம்பரியப் பாதுகாப்பு',
    subtitleEn: 'Empowering children with native linguistic skills',
    subtitleTa: 'குழந்தைகளுக்குத் தாய்மொழித் திறன் அளித்தல்'
  },
  {
    image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=1200',
    titleEn: 'Interactive Classroom Learning',
    titleTa: 'ஊடாடும் வகுப்பறை கற்றல்',
    subtitleEn: 'Innovative activities, speech contests, and weekly sessions',
    subtitleTa: 'புதுமையான செயல்பாடுகள், பேச்சுப் போட்டிகள் மற்றும் வாராந்திர வகுப்புகள்'
  },
  {
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200',
    titleEn: 'Dedicated Volunteer Teachers',
    titleTa: 'அர்ப்பணிப்புள்ள தன்னார்வ ஆசிரியர்கள்',
    subtitleEn: 'Building a bright future for the next generation',
    subtitleTa: 'அடுத்த தலைமுறைக்கு ஒரு பிரகாசமான எதிர்காலத்தை உருவாக்குதல்'
  }
];

export function NewsfeedTab({ 
  user, 
  colors, 
  t, 
  showToast, 
  i18n, 
  activeStudentId,
  dashboardEditPost,
  clearDashboardEditPost
}: TabProps & {
  dashboardEditPost?: any;
  clearDashboardEditPost?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [posts, setPosts] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showHelp, setShowHelp] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('pallithozhan_help_newsfeed') !== 'hidden';
    }
    return true;
  });

  const dismissHelp = () => {
    setShowHelp(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('pallithozhan_help_newsfeed', 'hidden');
    }
  };
  const handlePlayVideo = async (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      Alert.alert(
        'Offline Media',
        'Offline/locally created videos require cloud syncing/internet connectivity to stream on mobile devices.'
      );
      return;
    }
    try {
      await openBrowserAsync(url);
    } catch (error) {
      console.warn('WebBrowser failed, trying Linking fallback:', error);
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Unable to play this video link.');
      });
    }
  };

  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});
  const [editingCommentIdMap, setEditingCommentIdMap] = useState<Record<string, string>>({});
  const [editingCommentTextMap, setEditingCommentTextMap] = useState<Record<string, string>>({});
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedTaggedClassIds, setSelectedTaggedClassIds] = useState<string[]>([]);
  const [selectedTaggedStudentIds, setSelectedTaggedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  // Announcement Form state
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentTa, setContentTa] = useState('');
  const [titleTaDirty, setTitleTaDirty] = useState(false);
  const [contentTaDirty, setContentTaDirty] = useState(false);
  const [originalTitleEn, setOriginalTitleEn] = useState('');
  const [originalContentEn, setOriginalContentEn] = useState('');

  // Translation loading & debouncing states
  const [isTitleTranslating, setIsTitleTranslating] = useState(false);
  const [isContentTranslating, setIsContentTranslating] = useState(false);

  const debouncedTitleEn = useDebounce(titleEn, 700);
  const debouncedContentEn = useDebounce(contentEn, 850);

  // Auto-translate Title
  useEffect(() => {
    if (titleTaDirty) return;
    if (!debouncedTitleEn || debouncedTitleEn.trim() === '') {
      setTitleTa('');
      return;
    }
    if (debouncedTitleEn === originalTitleEn) return;

    const translateTitle = async () => {
      setIsTitleTranslating(true);
      try {
        const result = await translateWithGemini(debouncedTitleEn);
        if (!titleTaDirty) {
          setTitleTa(result);
        }
      } catch (err) {
        console.error('Title translation error:', err);
      } finally {
        setIsTitleTranslating(false);
      }
    };

    translateTitle();
  }, [debouncedTitleEn, titleTaDirty, originalTitleEn]);

  // Auto-translate Content/Description
  useEffect(() => {
    if (contentTaDirty) return;
    if (!debouncedContentEn || debouncedContentEn.trim() === '') {
      setContentTa('');
      return;
    }
    if (debouncedContentEn === originalContentEn) return;

    const translateContent = async () => {
      setIsContentTranslating(true);
      try {
        const result = await translateWithGemini(debouncedContentEn);
        if (!contentTaDirty) {
          setContentTa(result);
        }
      } catch (err) {
        console.error('Content translation error:', err);
      } finally {
        setIsContentTranslating(false);
      }
    };

    translateContent();
  }, [debouncedContentEn, contentTaDirty, originalContentEn]);
  
  // Media attachment state
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Google Drive Explorer & Connection states
  const [connectedDriveEmail, setConnectedDriveEmail] = useState<string>('');
  const [oauthModalVisible, setOauthModalVisible] = useState(false);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthStep, setOauthStep] = useState<1 | 2 | 3 | 4>(1);
  const [driveScopeChecked, setDriveScopeChecked] = useState(true);
  const [profileScopeChecked, setProfileScopeChecked] = useState(true);
  const [driveModalVisible, setDriveModalVisible] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [customType, setCustomType] = useState<'image' | 'video'>('image');
  const [drivePathStack, setDrivePathStack] = useState<string[]>([]);
  const [directPathInput, setDirectPathInput] = useState('');

  // Device upload and editing state
  const [deviceUploadedData, setDeviceUploadedData] = useState('');
  const [editingPostId, setEditingPostId] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: 'image' | 'video'; data: string; }[]>([]);

  // Autoscrolling state & refs
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [wrapperWidths, setWrapperWidths] = useState<Record<string, number>>({});
  const [heroActiveIndex, setHeroActiveIndex] = useState(0);
  const heroRef = useRef<ScrollView | null>(null);
  const carouselRefs = useRef<Record<string, ScrollView | null>>({});
  const [playingPostIds, setPlayingPostIds] = useState<Record<string, boolean>>({});

  const handleVideoPlaying = (postId: string, isPlaying: boolean) => {
    setPlayingPostIds(prev => ({
      ...prev,
      [postId]: isPlaying
    }));
  };

  // Voice recording states for voice comments
  const [recordingCommentPostId, setRecordingCommentPostId] = useState<string | null>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, clearRecording } = useAudioRecorder();

  const loadFeedData = async () => {
    try {
      const feed = await mockDb.getNewsfeed();
      setPosts(feed);
      const classesList = await mockDb.getClasses();
      setAllClasses(classesList);
      const studentsList = await mockDb.getUsers();
      setAllStudents(studentsList.filter((u: any) => u.role === 'student'));
    } catch (e) {
      showToast('Failed to load feed announcements.', 'error');
    }
  };

  useEffect(() => {
    loadFeedData();
    const savedEmail = getLocalStorageItem('drive_email', '');
    setConnectedDriveEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (dashboardEditPost) {
      handleStartEditPost(dashboardEditPost);
      if (clearDashboardEditPost) {
        clearDashboardEditPost();
      }
    }
  }, [dashboardEditPost]);

  // Autoscroll post attachments carousels (every 5 seconds)
  useEffect(() => {
    const postInterval = setInterval(() => {
      posts.forEach((post) => {
        // Skip autoscroll if a video is playing in this post
        if (playingPostIds[post.postId]) {
          return;
        }

        if (post.mediaAttachments && post.mediaAttachments.length > 1) {
          const total = post.mediaAttachments.length;
          const current = activeSlides[post.postId] || 0;
          const next = (current + 1) % total;
          const slideWidth = wrapperWidths[post.postId] || 400;
          const ref = carouselRefs.current[post.postId];
          if (ref && ref.scrollTo) {
            ref.scrollTo({ x: next * slideWidth, animated: true });
          }
        }
      });
    }, 5000);

    return () => {
      clearInterval(postInterval);
    };
  }, [posts, activeSlides, wrapperWidths, playingPostIds]);

  // Autoscroll Hero Banner (every 4 seconds)
  useEffect(() => {
    const heroInterval = setInterval(() => {
      const nextHeroIndex = (heroActiveIndex + 1) % HERO_SLIDES.length;
      setHeroActiveIndex(nextHeroIndex);
      if (heroRef.current && heroRef.current.scrollTo) {
        const heroWidth = wrapperWidths['hero'] || windowWidth;
        heroRef.current.scrollTo({ x: nextHeroIndex * heroWidth, animated: true });
      }
    }, 4000);

    return () => {
      clearInterval(heroInterval);
    };
  }, [heroActiveIndex, wrapperWidths]);

  const handleTitleEnChange = (text: string) => {
    setTitleEn(text);
  };

  const handleContentEnChange = (text: string) => {
    setContentEn(text);
  };

  // Google Drive simulation helpers
  const handleSelectDriveFile = (item: DriveItem) => {
    if (item.type === 'file') {
      const extension = item.name.split('.').pop() || '';
      const resolvedType = item.fileType || (['mp4', 'mov'].includes(extension.toLowerCase()) ? 'video' : 'image');
      
      const fileRecord = {
        name: item.name,
        type: resolvedType as 'image' | 'video',
        data: item.id.startsWith('http') ? item.id : `https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=600`
      };

      setAttachedFiles(prev => [...prev, fileRecord]);
      setDriveModalVisible(false);
      showToast(`Attached file from Google Drive: ${item.name}`, 'success');
    }
  };

  // Device upload / Real Web File Input Picker (Allows multiple mixed selection!)
  const fallbackSimulation = (type: 'image' | 'video') => {
    const defaultData = type === 'image' 
      ? 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800'
      : 'https://www.w3schools.com/html/mov_bbb.mp4';
      
    const fileRecord = {
      name: `Device_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
      type,
      data: defaultData
    };
    
    setAttachedFiles(prev => [...prev, fileRecord]);
    showToast(`Uploaded simulated ${type} successfully!`, 'success');
  };

  const handleNativeUpload = async (type: 'image' | 'video' | 'mixed') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Permission to access your photo library is required to upload files.'
        );
        return;
      }

      let mediaTypes = ImagePicker.MediaTypeOptions.All;
      if (type === 'image') {
        mediaTypes = ImagePicker.MediaTypeOptions.Images;
      } else if (type === 'video') {
        mediaTypes = ImagePicker.MediaTypeOptions.Videos;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFileRecords = result.assets.map(asset => {
          const resolvedType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
          return {
            name: asset.fileName || `mobile_upload_${Date.now()}.${resolvedType === 'video' ? 'mp4' : 'jpg'}`,
            type: resolvedType,
            data: asset.uri
          };
        });

        setAttachedFiles(prev => [...prev, ...newFileRecords]);
        showToast(`Attached ${newFileRecords.length} file(s) successfully!`, 'success');
      }
    } catch (error) {
      console.error('Native image picker failed:', error);
      fallbackSimulation(type === 'mixed' ? 'image' : type);
    }
  };

  // Device upload / Real Web File Input Picker (Allows multiple mixed selection!)
  const handleSimulateDeviceUpload = (type: 'image' | 'video' | 'mixed' = 'mixed') => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*'; // Allow selecting both photos and videos!
        input.multiple = true; // Allow selecting multiple files at once!
        input.style.position = 'absolute';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';

        document.body.appendChild(input);

        const cleanup = () => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        const readFileAndCompress = (file: any): Promise<{ name: string; type: 'image' | 'video'; data: string }> => {
          return new Promise((resolve) => {
            const isVideo = file.type ? file.type.startsWith('video/') : /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
            const resolvedType = isVideo ? 'video' : 'image';
            const blobUrl = URL.createObjectURL(file);
            resolve({
              name: file.name,
              type: resolvedType,
              data: blobUrl
            });
          });
        };

        input.onchange = async (e: any) => {
          try {
            const files = e.target.files;
            if (files && files.length > 0) {
              const promises = Array.from(files).map(file => readFileAndCompress(file));
              const results = await Promise.all(promises);
              const newFileRecords = results.filter(record => !!record.data);

              if (newFileRecords.length > 0) {
                setAttachedFiles(prev => [...prev, ...newFileRecords]);
                showToast(`Attached ${newFileRecords.length} file(s) successfully!`, 'success');
              }
            }
          } catch (err) {
            console.error('Error processing picked files:', err);
          } finally {
            cleanup();
          }
        };

        input.oncancel = () => {
          cleanup();
        };

        input.click();
      } catch (error) {
        console.error('Failed to open file picker:', error);
        fallbackSimulation('image');
      }
    } else {
      handleNativeUpload(type);
    }
  };

  const handleSavePost = async () => {
    if (!titleEn || !titleTa || !contentEn || !contentTa) {
      showToast('Please fill out all fields in both English and Tamil.', 'warning');
      return;
    }
    setSubmitting(true);
    
    const mediaUrls = attachedFiles.map(f => f.data);
    const mediaType = attachedFiles.length > 0 ? attachedFiles[0].type : undefined;

    const postPayload = {
      title: { en: titleEn, ta: titleTa },
      content: { en: contentEn, ta: contentTa },
      mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : undefined,
      mediaType,
      authorName: user?.fullName || 'Staff Member',
      taggedClassIds: selectedTaggedClassIds,
      taggedStudentIds: selectedTaggedStudentIds,
      mediaAttachments: attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        url: f.data
      }))
    };

    try {
      if (editingPostId) {
        await mockDb.updateNewsfeedPost(editingPostId, postPayload);
        showToast('Announcement updated successfully!', 'success');
      } else {
        await mockDb.createNewsfeedPost(postPayload);
        showToast('Tamil/English announcement successfully broadcasted!', 'success');
      }
    } catch (e) {
      showToast('Failed to save announcement.', 'error');
    }

    // Reset Form
    setTitleEn('');
    setTitleTa('');
    setContentEn('');
    setContentTa('');
    setOriginalTitleEn('');
    setOriginalContentEn('');
    setAttachedFiles([]);
    setSelectedTaggedClassIds([]);
    setSelectedTaggedStudentIds([]);
    setEditingPostId('');
    setTitleTaDirty(false);
    setContentTaDirty(false);
    setSubmitting(false);
    setModalVisible(false);
    loadFeedData();
  };

  const handleStartEditPost = (post: any) => {
    setEditingPostId(post.postId);
    setTitleEn(post.title.en);
    setTitleTa(post.title.ta);
    setContentEn(post.content.en);
    setContentTa(post.content.ta);
    setOriginalTitleEn(post.title.en);
    setOriginalContentEn(post.content.en);
    
    const mediaList = [];
    if (post.mediaAttachments && post.mediaAttachments.length > 0) {
      post.mediaAttachments.forEach((att: any) => {
        mediaList.push({
          name: att.name || 'Attached Media',
          type: att.type || 'image',
          data: att.url || att.data || ''
        });
      });
    } else if (post.mediaUrl) {
      mediaList.push({
        name: 'Attached Media',
        type: post.mediaType || 'image',
        data: post.mediaUrl
      });
    }
    setAttachedFiles(mediaList);
    setSelectedTaggedClassIds(post.taggedClassIds || []);
    setSelectedTaggedStudentIds(post.taggedStudentIds || []);
    setTitleTaDirty(false);
    setContentTaDirty(false);
    setModalVisible(true);
  };

  const handleDeletePost = async (postId: string) => {
    const performDelete = async () => {
      try {
        await mockDb.deleteNewsfeedPost(postId);
        showToast('Announcement removed.', 'success');
        loadFeedData();
      } catch (e) {
        showToast('Failed to delete announcement.', 'error');
      }
    };

    if (Platform.OS === 'web') {
      const ok = window.confirm('Are you sure you want to delete this announcement?');
      if (ok) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Announcement',
        'Are you sure you want to delete this announcement?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  // Reaction toggling
  const handleToggleReaction = async (postId: string, reaction: 'like' | 'love') => {
    if (!user) return;
    try {
      await mockDb.toggleReaction(postId, user.uid, reaction);
      const feed = await mockDb.getNewsfeed();
      setPosts(feed);
    } catch (e) {
      showToast('Failed to update reaction.', 'error');
    }
  };

  // Text comment posting
  const handlePostComment = async (postId: string) => {
    const text = commentTextMap[postId] || '';
    if (!text.trim() || !user) return;
    try {
      await mockDb.addComment(postId, user.uid, user.fullName, text.trim());
      setCommentTextMap(prev => ({ ...prev, [postId]: '' }));
      const feed = await mockDb.getNewsfeed();
      setPosts(feed);
      showToast('Comment posted!', 'success');
    } catch (e) {
      showToast('Failed to post comment.', 'error');
    }
  };

  // Voice comment capture and posting
  const handleToggleRecordComment = async (postId: string) => {
    if (isRecording) {
      if (recordingCommentPostId === postId) {
        // Stop and post voice comment!
        const base64 = await stopRecording();
        setRecordingCommentPostId(null);
        if (base64 && user) {
          try {
            await mockDb.addComment(postId, user.uid, user.fullName, '🎙️ Voice Comment / குரல் கருத்து', base64);
            const feed = await mockDb.getNewsfeed();
            setPosts(feed);
            showToast('Voice comment posted successfully!', 'success');
          } catch (e) {
            showToast('Failed to save voice comment.', 'error');
          }
        }
      } else {
        // Stop previous recording first
        await stopRecording();
        setRecordingCommentPostId(postId);
        await startRecording();
      }
    } else {
      setRecordingCommentPostId(postId);
      const ok = await startRecording();
      if (ok) {
        showToast('Microphone active... click Mic again to save & post.', 'success');
      } else {
        showToast('Microphone connection failed.', 'error');
      }
    }
  };

  const handleSaveEditComment = async (postId: string, commentId: string) => {
    const text = editingCommentTextMap[postId] || '';
    if (!text.trim()) return;
    try {
      await mockDb.editComment(postId, commentId, text.trim());
      setEditingCommentIdMap(prev => ({ ...prev, [postId]: '' }));
      const feed = await mockDb.getNewsfeed();
      setPosts(feed);
      showToast('Comment updated!', 'success');
    } catch (e) {
      showToast('Failed to update comment.', 'error');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const confirmDel = Platform.OS !== 'web' || window.confirm('Are you sure you want to delete this comment?');
    if (!confirmDel) return;
    try {
      await mockDb.deleteComment(postId, commentId);
      const feed = await mockDb.getNewsfeed();
      setPosts(feed);
      showToast('Comment deleted successfully.', 'success');
    } catch (e) {
      showToast('Failed to delete comment.', 'error');
    }
  };

  const isAdmin = user?.role === 'admin';
  const currentFolderItems = getCurrentFolderItems(drivePathStack);

  // Audience filtering: Parents and Students seeGeneral posts OR those tagged to their class or UID
  // Sorted dynamically based on the active sortOrder state
  const audienceFilteredPosts = posts
    .filter(post => {
      if (['admin', 'teacher', 'volunteer'].includes(user?.role || '')) {
        return true; // Staff sees all broadcasts
      }
      const hasTags = (post.taggedClassIds && post.taggedClassIds.length > 0) || 
                      (post.taggedStudentIds && post.taggedStudentIds.length > 0);
      if (!hasTags) return true; // General post

      const targetStudentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
      const studentClass = allClasses.find(c => c.studentIds && c.studentIds.includes(targetStudentId));
      
      const matchClass = studentClass && post.taggedClassIds?.includes(studentClass.classId);
      const matchStudent = post.taggedStudentIds?.includes(targetStudentId);

      return matchClass || matchStudent;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  return (
    <View style={styles.tabContentWrapper}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('newsfeed.title')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Broadcast updates, speech contest details, and Google Drive resources
          </ThemedText>
        </View>

        {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
          <Pressable
            onPress={() => {
              setEditingPostId('');
              setTitleEn('');
              setTitleTa('');
              setContentEn('');
              setContentTa('');
              setOriginalTitleEn('');
              setOriginalContentEn('');
              setAttachedFiles([]);
              setSelectedTaggedClassIds([]);
              setSelectedTaggedStudentIds([]);
              setTitleTaDirty(false);
              setContentTaDirty(false);
              setModalVisible(!modalVisible);
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
            <ThemedText style={styles.actionButtonText}>
              BroadCast News
            </ThemedText>
          </Pressable>
        )}
      </View>

      {showHelp && (
        <View style={{
          backgroundColor: colors.primaryLight,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: Spacing.three,
          marginBottom: Spacing.three,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: Spacing.three }}>
              <ThemedText style={{ fontWeight: '700', color: colors.primary, fontSize: 13, marginBottom: 4 }}>
                ℹ️ Quick Guide / உதவிக்குறிப்பு
              </ThemedText>
              <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.text }}>
                Welcome to the Announcement Board. Teachers and administrators post weekly branch updates, homework instructions, and school notices. You can view comments, play speech contest videos, or browse shared Google Drive assets.
              </ThemedText>
              <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                அறிவிப்புப் பலகைக்கு வரவேற்கிறோம். இங்கு நீங்கள் வாராந்திர அறிவிப்புகள், வீட்டுப்பாடங்கள் மற்றும் பள்ளித் தகவல்களைக் காணலாம்.
              </ThemedText>
            </View>
            <Pressable onPress={dismissHelp} style={{ padding: 4 }}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Balar Malar Parramatta Premium Hero Banner Slider */}
      <View
        style={{
          width: '100%',
          height: 240,
          borderRadius: 24,
          overflow: 'hidden',
          marginBottom: Spacing.four,
          backgroundColor: '#000',
          position: 'relative',
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          shadowOpacity: colors.shadowOpacity,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12
        }}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          if (width > 0 && width !== wrapperWidths['hero']) {
            setWrapperWidths(prev => ({ ...prev, hero: width }));
          }
        }}
      >
        <ScrollView
          ref={heroRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const slideWidth = event.nativeEvent.layoutMeasurement.width || wrapperWidths['hero'] || windowWidth;
            const offset = event.nativeEvent.contentOffset.x;
            const page = Math.round(offset / slideWidth);
            if (heroActiveIndex !== page) {
              setHeroActiveIndex(page);
            }
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {HERO_SLIDES.map((slide, idx) => {
            const slideWidth = wrapperWidths['hero'] || windowWidth;
            return (
              <View key={idx} style={{ width: slideWidth, height: 240, position: 'relative' }}>
                <Image
                  source={typeof slide.image === 'string' ? { uri: slide.image } : slide.image}
                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                />
                {/* Premium Gradation Overlay Mask */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.45)'
                  }}
                />
                {/* Left decorative bar */}
                <View
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: 40,
                    bottom: 40,
                    width: 4,
                    backgroundColor: colors.primary,
                    borderRadius: 2
                  }}
                />
                {/* Hero Text Content */}
                <View
                  style={{
                    position: 'absolute',
                    left: 36,
                    bottom: 30,
                    right: 36,
                    gap: 4
                  }}
                >
                  {/* Bilingual pride header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Balar Malar</ThemedText>
                    </View>
                    <ThemedText style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>பரமட்டா கிளை</ThemedText>
                  </View>
                  <ThemedText style={{ color: '#FFF', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>
                    {i18n.language === 'ta' ? slide.titleTa : slide.titleEn}
                  </ThemedText>
                  <ThemedText style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>
                    {i18n.language === 'ta' ? slide.subtitleTa : slide.subtitleEn}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Dots Indicator Overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            right: 20,
            flexDirection: 'row',
            gap: 6
          }}
        >
          {HERO_SLIDES.map((_, idx) => {
            const isActive = heroActiveIndex === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  setHeroActiveIndex(idx);
                  if (heroRef.current && heroRef.current.scrollTo) {
                    const heroWidth = wrapperWidths['hero'] || windowWidth;
                    heroRef.current.scrollTo({ x: idx * heroWidth, animated: true });
                  }
                }}
                style={{
                  width: isActive ? 14 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.4)'
                }}
              />
            );
          })}
        </View>
      </View>

      {/* Broadcast news modal form card */}
      {modalVisible && (
        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <ThemedText style={styles.formTitle}>
            {editingPostId ? 'Edit Broadcast Announcement' : 'Draft Bilingual Announcement'}
          </ThemedText>

          <View style={styles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Title (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Annual Speech Contest"
                placeholderTextColor={colors.textSecondary}
                value={titleEn}
                onChangeText={handleTitleEnChange}
              />
            </View>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>
                தமிழ் தலைப்பு * {isTitleTranslating && <ThemedText style={{ fontSize: 11, color: colors.primary }}> (Translating...)</ThemedText>}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="தமிழ் தலைப்பு..."
                placeholderTextColor={colors.textSecondary}
                value={titleTa}
                onChangeText={(txt) => { setTitleTa(txt); setTitleTaDirty(true); }}
              />
            </View>
          </View>

          <View style={styles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Announcement Description (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Details..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                value={contentEn}
                onChangeText={handleContentEnChange}
              />
            </View>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>
                தமிழ் அறிவிப்பு விவரம் * {isContentTranslating && <ThemedText style={{ fontSize: 11, color: colors.primary }}> (Translating...)</ThemedText>}
              </ThemedText>
              <TextInput
                style={[styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="அறிவிப்பு விவரம்..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                value={contentTa}
                onChangeText={(txt) => { setContentTa(txt); setContentTaDirty(true); }}
              />
            </View>
          </View>

          {/* TARGET AUDIENCE PICKER */}
          <View style={{ gap: Spacing.two }}>
            <ThemedText style={styles.formInputLabel}>Target Class Audience (Optional / Skip for General)</ThemedText>
            <View style={styles.classChipsRow}>
              {allClasses.map(cls => {
                const isSel = selectedTaggedClassIds.includes(cls.classId);
                return (
                  <Pressable
                    key={cls.classId}
                    onPress={() => setSelectedTaggedClassIds(prev => prev.includes(cls.classId) ? prev.filter(x => x !== cls.classId) : [...prev, cls.classId])}
                    style={[styles.classChip, { backgroundColor: isSel ? colors.secondaryLight : colors.background, borderColor: isSel ? colors.secondary : colors.border }]}
                  >
                    <ThemedText style={[styles.classChipText, { color: isSel ? colors.secondary : colors.text }]}>{cls.className.split(' - ')[0]}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText style={styles.formInputLabel}>Target Individual Students (Optional)</ThemedText>
            <TextInput
              style={[styles.directPathInput, { color: colors.text, borderColor: colors.border, marginBottom: 4 }]}
              placeholder="🔍 Filter student names to tag..."
              placeholderTextColor={colors.textSecondary}
              value={studentSearchQuery}
              onChangeText={setStudentSearchQuery}
            />
            <ScrollView horizontal style={{ minHeight: 40 }} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {allStudents.filter(s => !studentSearchQuery || s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase())).map(s => {
                const isSel = selectedTaggedStudentIds.includes(s.uid);
                return (
                  <Pressable
                    key={s.uid}
                    onPress={() => setSelectedTaggedStudentIds(prev => prev.includes(s.uid) ? prev.filter(x => x !== s.uid) : [...prev, s.uid])}
                    style={[{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, height: 32 }, isSel ? { backgroundColor: colors.primaryLight, borderColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <ThemedText style={{ fontSize: 11, color: isSel ? colors.primary : colors.text, fontWeight: '700' }}>{s.fullName}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* MEDIA ATTACH EXPLORERS */}
          <View style={[styles.mediaAttachmentWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.driveHeaderRow}>
              <FolderOpen size={16} color={colors.secondary} />
              <ThemedText style={styles.driveHeaderTitle}>Balar Malar Google Drive & Local Photo Upload</ThemedText>
            </View>
            <ThemedText style={[styles.driveDesc, { color: colors.textSecondary }]}>
              Attach pictures/videos from Google Drive or select local files from your device.
            </ThemedText>

            {/* Google Drive Connection Dashboard */}
            {!connectedDriveEmail ? (
              <View style={[styles.driveConnectCard, { borderColor: colors.border, backgroundColor: colors.cardBg, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12, gap: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <FolderOpen size={20} color={colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Connect Google Drive / கூகுள் டிரைவ் இணைப்பு</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Connect your Google Account to select files directly.</ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    setOauthEmail('');
                    setOauthStep(1);
                    setOauthModalVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.driveConnectBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, marginTop: 4, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }
                  ]}
                >
                  <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Connect Google Drive / கூகுள் டிரைவை இணைக்கவும்</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.driveConnectCard, { borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.08)', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12, gap: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <CheckCircle size={18} color="#4CAF50" />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>Connected to Google Drive</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Linked: {connectedDriveEmail}</ThemedText>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      setConnectedDriveEmail('');
                      setLocalStorageItem('drive_email', '');
                      showToast('Google Drive disconnected.', 'success');
                    }}
                    style={{ paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.cardBg }}
                  >
                    <ThemedText style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Disconnect</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={{ gap: Spacing.two }}>
              <View style={styles.mediaPresetRow}>
                <Pressable onPress={() => handleSimulateDeviceUpload('mixed')} style={[styles.mediaPresetCard, { backgroundColor: colors.cardBg, borderColor: colors.border, flex: 1, paddingVertical: 10, justifyContent: 'center' }]}>
                  <ImageIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Video size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <ThemedText style={[styles.mediaPresetText, { fontWeight: '700' }]}>Upload Photo/Video / புகைப்படம்/வீடியோவை பதிவேற்றவும்</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!connectedDriveEmail) {
                      showToast('Please connect Google Drive first!', 'warning');
                      return;
                    }
                    setDriveModalVisible(true);
                  }}
                  style={[
                    styles.mediaPresetCard,
                    {
                      backgroundColor: connectedDriveEmail ? colors.primaryLight : colors.background,
                      borderColor: connectedDriveEmail ? colors.primary : colors.border
                    }
                  ]}
                >
                  <FolderOpen size={12} color={connectedDriveEmail ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
                  <ThemedText style={[styles.mediaPresetText, { color: connectedDriveEmail ? colors.primary : colors.textSecondary }]}>Browse Google Drive</ThemedText>
                </Pressable>
              </View>

              {attachedFiles.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
                  {attachedFiles.map((file, i) => {
                    const isVideo = file.type === 'video';
                    const fileUrl = file.data || '';
                    return (
                      <View key={i} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: colors.border, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
                        {isVideo ? (
                          Platform.OS === 'web' ? (
                            <video 
                              src={fileUrl} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                              <Video size={24} color={colors.accent} />
                            </View>
                          )
                        ) : (
                          Platform.OS === 'web' ? (
                            <img 
                              src={fileUrl} 
                              alt={file.name || 'Preview'} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <Image 
                              source={{ uri: fileUrl }} 
                              style={{ width: '100%', height: '100%' }} 
                              resizeMode="cover"
                            />
                          )
                        )}
                        {/* Remove button */}
                        <Pressable 
                          onPress={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: colors.danger,
                            borderRadius: 10,
                            width: 22,
                            height: 22,
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.3,
                            shadowRadius: 1.5,
                            elevation: 3
                          }}
                        >
                          <X size={12} color="#FFF" />
                        </Pressable>
                        {/* Type overlay label */}
                        <View style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          paddingVertical: 2,
                          paddingHorizontal: 4
                        }}>
                          <ThemedText style={{ fontSize: 9, color: '#FFF', textAlign: 'center' }} numberOfLines={1}>
                            {file.name || (isVideo ? 'Video' : 'Image')}
                          </ThemedText>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.formButtonRow}>
            <Pressable onPress={() => setModalVisible(false)} style={[styles.formCancelButton, { borderColor: colors.border }]}>
              <ThemedText>{t('common.cancel')}</ThemedText>
            </Pressable>
            <Pressable onPress={handleSavePost} disabled={submitting} style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>
                  {editingPostId ? 'Save Edits' : 'Publish Broadcast'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Broadcast news lists */}
      <View style={{ flex: 1 }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: Spacing.two,
          paddingHorizontal: Spacing.one
        }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
            {i18n.language === 'ta' ? `அறிவிப்புகள் (${audienceFilteredPosts.length})` : `Announcements (${audienceFilteredPosts.length})`}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
              {i18n.language === 'ta' ? 'வரிசைப்படுத்து:' : 'Sort by:'}
            </ThemedText>
            <Pressable
              onPress={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.cardBg,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
            >
              <ThemedText style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                {sortOrder === 'newest' 
                  ? (i18n.language === 'ta' ? 'புதியது முதலில்' : 'Newest First') 
                  : (i18n.language === 'ta' ? 'பழையது முதலில்' : 'Oldest First')}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.postsList}>
          {audienceFilteredPosts.map((post) => {
            const title = i18n.language === 'ta' ? post.title.ta : post.title.en;
            const content = i18n.language === 'ta' ? post.content.ta : post.content.en;

            // Compute cumulative reactions counts:
            const rxMap = post.reactions || {};
            const rxKeys = Object.keys(rxMap);
            const likeCount = rxKeys.filter(k => rxMap[k] === 'like').length;
            const loveCount = rxKeys.filter(k => rxMap[k] === 'love').length;
            
            const myRx = user ? rxMap[user.uid] : null;

            return (
              <View key={post.postId} style={[styles.postCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                
                <View style={styles.postMetaRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
                    <ThemedText style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                      {post.authorName.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={{ marginLeft: Spacing.two, flex: 1 }}>
                    <ThemedText style={styles.postAuthor}>{post.authorName}</ThemedText>
                    <ThemedText style={[styles.postDate, { color: colors.textSecondary }]}>
                      {new Date(post.createdAt).toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-US')}
                    </ThemedText>
                  </View>

                  {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => handleStartEditPost(post)} style={{ padding: 4 }}>
                        <Edit size={14} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeletePost(post.postId)} style={{ padding: 4 }}>
                        <Trash2 size={14} color={colors.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>

                <ThemedText style={styles.postTitle}>{title}</ThemedText>
                <ThemedText style={[styles.postContent, { color: colors.text }]}>{content}</ThemedText>

                {/* Attached media display (Autoscrolling Carousel for multiple, single fallback) */}
                {((post.mediaAttachments && post.mediaAttachments.length > 0) || post.mediaUrl) && (
                  <View 
                    style={[styles.postImageWrapper, { borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }]}
                    onLayout={(event) => {
                      const { width } = event.nativeEvent.layout;
                      if (width > 0 && wrapperWidths[post.postId] !== width) {
                        setWrapperWidths(prev => ({ ...prev, [post.postId]: width }));
                      }
                    }}
                  >
                    {post.mediaAttachments && post.mediaAttachments.length > 0 ? (
                      <View style={{ flex: 1 }}>
                        <ScrollView
                          ref={el => { carouselRefs.current[post.postId] = el; }}
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          onMomentumScrollEnd={(event) => {
                            const width = wrapperWidths[post.postId] || 400;
                            const offsetX = event.nativeEvent.contentOffset.x;
                            const idx = Math.round(offsetX / width);
                            setActiveSlides(prev => ({ ...prev, [post.postId]: idx }));
                          }}
                          style={{ flex: 1 }}
                        >
                          {post.mediaAttachments.map((media: any, idx: number) => {
                            const fileUrl = media.url || media.data;
                            const slideWidth = wrapperWidths[post.postId] || 400;
                            return (
                              <View key={idx} style={{ width: slideWidth, height: '100%' }}>
                                {media.type === 'video' ? (
                                  <VideoPlayer 
                                    url={fileUrl} 
                                    onPlayingStateChange={(playing) => handleVideoPlaying(post.postId, playing)}
                                  />
                                ) : (
                                  <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
                                    {Platform.OS === 'web' ? (
                                      <img 
                                        src={fileUrl} 
                                        alt={`Slide ${idx}`} 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                      />
                                    ) : (
                                      <Image
                                        source={{ uri: fileUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                      />
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>

                        {/* Navigation dots indicator */}
                        {post.mediaAttachments.length > 1 && (
                          <View style={{
                            position: 'absolute',
                            bottom: 12,
                            left: 0,
                            right: 0,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            {post.mediaAttachments.map((_: any, idx: number) => {
                              const isCurrent = (activeSlides[post.postId] || 0) === idx;
                              return (
                                <View
                                  key={idx}
                                  style={{
                                    width: isCurrent ? 14 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: isCurrent ? colors.primary : 'rgba(255, 255, 255, 0.65)',
                                    borderWidth: 0.5,
                                    borderColor: 'rgba(0, 0, 0, 0.15)'
                                  }}
                                />
                              );
                            })}
                          </View>
                        )}
                      </View>
                    ) : (
                      // Single mediaUrl fallback (backward compatibility)
                      <View style={{ flex: 1 }}>
                        {post.mediaType === 'video' ? (
                          <VideoPlayer 
                            url={post.mediaUrl} 
                            onPlayingStateChange={(playing) => handleVideoPlaying(post.postId, playing)}
                          />
                        ) : (
                          <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
                            {Platform.OS === 'web' ? (
                              <img 
                                src={post.mediaUrl} 
                                alt="Attachment" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                              />
                            ) : (
                              <Image
                                source={{ uri: post.mediaUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Social Actions row */}
                <View style={{ marginTop: 12 }}>
                  <View style={styles.postReactionsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {likeCount > 0 && (
                        <ThemedText style={[styles.reactionStatsText, { color: colors.primary }]}>
                          👍 {likeCount}
                        </ThemedText>
                      )}
                      {loveCount > 0 && (
                        <ThemedText style={[styles.reactionStatsText, { color: colors.secondary }]}>
                          ❤️ {loveCount}
                        </ThemedText>
                      )}
                      {likeCount === 0 && loveCount === 0 && (
                        <ThemedText style={[styles.reactionStatsText, { color: colors.textSecondary }]}>
                          Be the first to react!
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                      {post.comments?.length || 0} comment(s)
                    </ThemedText>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Actions buttons */}
                  <View style={styles.postActionsBar}>
                    <Pressable
                      onPress={() => handleToggleReaction(post.postId, 'like')}
                      style={[styles.actionBtn, myRx === 'like' && { backgroundColor: colors.primaryLight }]}
                    >
                      <ThumbsUp size={14} color={myRx === 'like' ? colors.primary : colors.textSecondary} fill={myRx === 'like' ? colors.primary : 'none'} />
                      <ThemedText style={[styles.actionBtnText, { color: myRx === 'like' ? colors.primary : colors.textSecondary }]}>Like</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleReaction(post.postId, 'love')}
                      style={[styles.actionBtn, myRx === 'love' && { backgroundColor: colors.secondaryLight }]}
                    >
                      <Heart size={14} color={myRx === 'love' ? colors.secondary : colors.textSecondary} fill={myRx === 'love' ? colors.secondary : 'none'} />
                      <ThemedText style={[styles.actionBtnText, { color: myRx === 'love' ? colors.secondary : colors.textSecondary }]}>Love</ThemedText>
                    </Pressable>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Comments lists */}
                  <View style={styles.commentsSection}>
                    {post.comments?.map((comment: any) => {
                      const isEditing = editingCommentIdMap[post.postId] === comment.commentId;
                      const isCommentAuthor = user?.uid === comment.authorUid;

                      return (
                        <View key={comment.commentId} style={styles.commentBubbleWrapper}>
                          <View style={[styles.commentAvatar, { backgroundColor: colors.primaryLight }]}>
                            <ThemedText style={[styles.commentAvatarText, { color: colors.primary }]}>
                              {comment.authorName.charAt(0)}
                            </ThemedText>
                          </View>
                          
                          <View style={[styles.commentBubble, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View style={styles.commentHeader}>
                              <ThemedText style={[styles.commentAuthor, { color: colors.text }]}>{comment.authorName}</ThemedText>
                              <ThemedText style={[styles.commentDate, { color: colors.textSecondary }]}>
                                {new Date(comment.createdAt).toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-US')}
                              </ThemedText>
                            </View>

                            {isEditing ? (
                              <View style={{ marginTop: 4 }}>
                                <TextInput
                                  style={[styles.commentInputEdit, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBg }]}
                                  value={editingCommentTextMap[post.postId] || ''}
                                  onChangeText={(txt) => setEditingCommentTextMap(prev => ({ ...prev, [post.postId]: txt }))}
                                  multiline
                                />
                                <View style={styles.editCommentBtnRow}>
                                  <Pressable
                                    onPress={() => setEditingCommentIdMap(prev => ({ ...prev, [post.postId]: '' }))}
                                    style={[styles.editCommentBtn, { borderWidth: 1, borderColor: colors.border }]}
                                  >
                                    <ThemedText style={[styles.editCommentBtnText, { color: colors.textSecondary }]}>Cancel</ThemedText>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleSaveEditComment(post.postId, comment.commentId)}
                                    style={[styles.editCommentBtn, { backgroundColor: colors.primary }]}
                                  >
                                    <ThemedText style={[styles.editCommentBtnText, { color: '#FFF' }]}>Save</ThemedText>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <>
                                <ThemedText style={[styles.commentText, { color: colors.text }]}>{comment.text}</ThemedText>
                                
                                {/* Voice Comment Playback */}
                                {comment.voiceUrl && (
                                  <View style={{ marginVertical: 4 }}>
                                    <AudioPlayer voiceUrl={comment.voiceUrl} colors={colors} compact />
                                  </View>
                                )}

                                {(isCommentAuthor || isAdmin) && (
                                  <View style={styles.commentActions}>
                                    <Pressable
                                      onPress={() => {
                                        setEditingCommentIdMap(prev => ({ ...prev, [post.postId]: comment.commentId }));
                                        setEditingCommentTextMap(prev => ({ ...prev, [post.postId]: comment.text }));
                                      }}
                                    >
                                      <ThemedText style={[styles.commentActionText, { color: colors.secondary }]}>Edit</ThemedText>
                                    </Pressable>
                                    <Pressable onPress={() => handleDeleteComment(post.postId, comment.commentId)}>
                                      <ThemedText style={[styles.commentActionText, { color: colors.danger }]}>Delete</ThemedText>
                                    </Pressable>
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}

                    {/* Comment Input Box */}
                    <View style={styles.commentInputRow}>
                      {/* Microphone Voice Recorder Icon Button next to Input */}
                      <Pressable
                        onPress={() => handleToggleRecordComment(post.postId)}
                        style={({ pressed }) => [
                          {
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: recordingCommentPostId === post.postId && isRecording ? colors.primary : colors.border,
                            backgroundColor: recordingCommentPostId === post.postId && isRecording ? colors.primaryLight : colors.background
                          },
                          { opacity: pressed ? 0.8 : 1 }
                        ]}
                      >
                        {recordingCommentPostId === post.postId && isRecording ? (
                          <Square size={14} color={colors.primary} fill={colors.primary} />
                        ) : (
                          <Mic size={14} color={colors.textSecondary} />
                        )}
                      </Pressable>

                      <TextInput
                        style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        placeholder={
                          recordingCommentPostId === post.postId && isRecording 
                            ? `🎙️ Recording (${recordingTime}s)... Mic to post!`
                            : "Write a comment... / கருத்து எழுதவும்..."
                        }
                        placeholderTextColor={colors.textSecondary}
                        value={commentTextMap[post.postId] || ''}
                        onChangeText={(txt) => setCommentTextMap(prev => ({ ...prev, [post.postId]: txt }))}
                        onSubmitEditing={() => handlePostComment(post.postId)}
                      />
                      <Pressable
                        onPress={() => handlePostComment(post.postId)}
                        style={({ pressed }) => [
                          styles.commentSendBtn,
                          { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
                        ]}
                      >
                        <Send size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  </View>
                </View>

              </View>
            );
          })}
        </View>
      </View>

      {/* Google Drive Explorer Modal */}
      <Modal
        visible={driveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDriveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>Balar Malar Google Drive</ThemedText>
              <Pressable onPress={() => setDriveModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Breadcrumbs stack */}
            <View style={[styles.breadcrumbsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Pressable 
                onPress={() => setDrivePathStack([])} 
                style={styles.backStackBtn}
                disabled={drivePathStack.length === 0}
              >
                <ArrowLeft size={14} color={drivePathStack.length > 0 ? colors.primary : colors.textSecondary} />
              </Pressable>
              
              <ThemedText style={styles.breadcrumbItemText} onPress={() => setDrivePathStack([])}>
                Drive Root
              </ThemedText>
              {drivePathStack.map((segment, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ChevronRight size={10} color={colors.textSecondary} />
                  <ThemedText 
                    style={i === drivePathStack.length - 1 ? styles.breadcrumbItemTextActive : styles.breadcrumbItemText}
                    onPress={() => setDrivePathStack(prev => prev.slice(0, i + 1))}
                  >
                    {segment}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Items list */}
            <ScrollView style={styles.driveItemsList}>
              {currentFolderItems.length === 0 ? (
                <ThemedText style={[styles.emptyFolderText, { color: colors.textSecondary }]}>
                  Empty folder / கோப்பு வெறுமையாக உள்ளது
                </ThemedText>
              ) : (
                currentFolderItems.map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      if (item.type === 'folder') {
                        setDrivePathStack(prev => [...prev, item.name]);
                      } else {
                        handleSelectDriveFile(item);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.driveItemRow,
                      { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      {item.type === 'folder' ? (
                        <Folder size={16} color={colors.primary} />
                      ) : (
                        <File size={16} color={colors.textSecondary} />
                      )}
                      <ThemedText style={styles.driveItemName}>{item.name}</ThemedText>
                    </View>
                    <ChevronRight size={12} color={colors.textSecondary} />
                  </Pressable>
                ))
              )}
            </ScrollView>

            <View style={styles.driveModalFooter}>
              <Pressable
                onPress={() => setDriveModalVisible(false)}
                style={[styles.driveModalCloseBtn, { borderColor: colors.border }]}
              >
                <ThemedText style={styles.driveModalCloseBtnText}>Close Explorer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Google Drive OAuth Simulator Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={oauthModalVisible}
        onRequestClose={() => setOauthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.oauthModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            
            {/* Top Google & Balar Malar NSW Header */}
            <View style={styles.oauthHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FolderOpen size={24} color="#4285F4" />
                <ThemedText style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                  Google <ThemedText style={{ color: '#4285F4' }}>A</ThemedText>
                  <ThemedText style={{ color: '#EA4335' }}>c</ThemedText>
                  <ThemedText style={{ color: '#FBBC05' }}>c</ThemedText>
                  <ThemedText style={{ color: '#4285F4' }}>o</ThemedText>
                  <ThemedText style={{ color: '#34A853' }}>u</ThemedText>
                  <ThemedText style={{ color: '#EA4335' }}>n</ThemedText>
                  <ThemedText style={{ color: '#4285F4' }}>t</ThemedText>
                </ThemedText>
              </View>
              <Pressable onPress={() => setOauthModalVisible(false)} style={{ padding: 4 }}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {oauthStep === 1 && (
              <View style={styles.oauthStepContent}>
                <ThemedText style={styles.oauthTitle}>Sign in</ThemedText>
                <ThemedText style={styles.oauthSubtitle}>to continue to Balar Malar NSW Companion Portal</ThemedText>
                
                <TextInput
                  style={[styles.oauthInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Email or phone"
                  placeholderTextColor={colors.textSecondary}
                  value={oauthEmail}
                  onChangeText={setOauthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 10, lineHeight: 15 }}>
                  To continue, Google will share your name, email address, language preference, and profile picture with Balar Malar.
                </ThemedText>
                
                <View style={styles.oauthActionRow}>
                  <Pressable
                    onPress={() => setOauthModalVisible(false)}
                    style={[styles.oauthBtnCancel, { borderColor: colors.border }]}
                  >
                    <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!oauthEmail.includes('@') || oauthEmail.length < 5) {
                        showToast('Please enter a valid Google Email ID!', 'error');
                        return;
                      }
                      setOauthStep(2);
                    }}
                    style={[styles.oauthBtnNext, { backgroundColor: '#1a73e8' }]}
                  >
                    <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Next</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {oauthStep === 2 && (
              <View style={styles.oauthStepContent}>
                <ThemedText style={styles.oauthTitle}>Balar Malar wants to access your Google Account</ThemedText>
                <ThemedText style={styles.oauthEmailPill}>{oauthEmail}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 15 }}>
                  This will allow Balar Malar NSW Companion Portal to:
                </ThemedText>

                {/* Scopes Checklist */}
                <View style={{ gap: 12, marginBottom: 20 }}>
                  <Pressable 
                    onPress={() => setDriveScopeChecked(!driveScopeChecked)}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                  >
                    <View style={{ marginTop: 2 }}>
                      <CheckCircle size={16} color={driveScopeChecked ? '#1a73e8' : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        See, edit, create, and delete all of your Google Drive files
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                        Required to upload and link newsfeed pictures and training videos.
                      </ThemedText>
                    </View>
                  </Pressable>

                  <Pressable 
                    onPress={() => setProfileScopeChecked(!profileScopeChecked)}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                  >
                    <View style={{ marginTop: 2 }}>
                      <CheckCircle size={16} color={profileScopeChecked ? '#1a73e8' : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Associate you with your personal info on Google
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                        View your email address and basic profile info.
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>

                <ThemedText style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14, marginBottom: 15 }}>
                  Make sure you trust Balar Malar NSW Portal. You may be sharing sensitive info with this app. You can learn more in Google's Privacy Policy.
                </ThemedText>

                <View style={styles.oauthActionRow}>
                  <Pressable
                    onPress={() => setOauthStep(1)}
                    style={[styles.oauthBtnCancel, { borderColor: colors.border }]}
                  >
                    <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Back</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!driveScopeChecked) {
                        showToast('You must authorize Google Drive access to continue!', 'error');
                        return;
                      }
                      setOauthStep(3);
                      // Simulate progress spinner
                      setTimeout(() => {
                        setOauthStep(4);
                        // Save email
                        setConnectedDriveEmail(oauthEmail);
                        setLocalStorageItem('drive_email', oauthEmail);
                        showToast('Google Drive connected successfully!', 'success');
                        // Close modal after success display
                        setTimeout(() => {
                          setOauthModalVisible(false);
                        }, 1200);
                      }, 1800);
                    }}
                    style={[styles.oauthBtnNext, { backgroundColor: '#1a73e8' }]}
                  >
                    <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Allow</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {oauthStep === 3 && (
              <View style={[styles.oauthStepContent, { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }]}>
                <ActivityIndicator size="large" color="#1a73e8" style={{ marginBottom: 15 }} />
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Connecting Google Account...</ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Setting up sandbox drive environment...</ThemedText>
              </View>
            )}

            {oauthStep === 4 && (
              <View style={[styles.oauthStepContent, { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }]}>
                <CheckCircle size={54} color="#34A853" style={{ marginBottom: 15 }} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800', color: '#34A853' }}>Access Granted!</ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  Linked as: {oauthEmail}
                </ThemedText>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}
