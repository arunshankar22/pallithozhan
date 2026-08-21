import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform
} from 'react-native';
import {
  Plus,
  Search,
  BookOpen,
  Download,
  CheckCircle,
  Trash2,
  ExternalLink,
  X,
  Award,
  Book
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { Spacing } from '@/constants/theme';
import { libraryService, Book as BookType, ReadingProgress } from '@/services/libraryService';
import { ThirukkuralPracticeGuide } from '@/components/ThirukkuralPracticeGuide';

export function LibraryTab({ user, colors, t, showToast, i18n, insets }: TabProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  // State Variables
  const [books, setBooks] = useState<BookType[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Book Detail Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [readingProgressEntry, setReadingProgressEntry] = useState<ReadingProgress | null>(null);

  // Online PDF Reader state
  const [pdfReaderVisible, setPdfReaderVisible] = useState(false);
  const [thirukuralVisible, setThirukuralVisible] = useState(false);

  // Add Book Modal state (Teachers/Admins)
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [bookTitleEn, setBookTitleEn] = useState('');
  const [bookTitleTa, setBookTitleTa] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookGrade, setBookGrade] = useState('KG');
  const [bookCategory, setBookCategory] = useState<'textbook' | 'workbook' | 'storybook' | 'audio'>('textbook');
  const [bookPages, setBookPages] = useState('');
  const [bookPoints, setBookPoints] = useState('50');
  const [bookDescEn, setBookDescEn] = useState('');
  const [bookDescTa, setBookDescTa] = useState('');

  // Selected Upload files
  const [coverFile, setCoverFile] = useState<{ name: string; base64: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<{ name: string; base64: string } | null>(null);
  const [submittingBook, setSubmittingBook] = useState(false);

  // Grade lists
  const gradeLevels = ['All', 'General', 'KG', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9'];
  const categories = ['All', 'textbook', 'workbook', 'storybook', 'audio'];

  useEffect(() => {
    loadLibraryData();
  }, [user]);

  const loadLibraryData = async () => {
    setLoading(true);
    try {
      const bookList = await libraryService.getBooks();
      setBooks(bookList);

      if (user?.uid) {
        const progressList = await libraryService.getReadingProgress(user.uid);
        setProgress(progressList);
      }
    } catch (err) {
      showToast('Failed to load library data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book: BookType) => {
    setSelectedBook(book);
    const bookProgress = progress.find(p => p.bookId === book.bookId) || null;
    setReadingProgressEntry(bookProgress);
    setDetailModalVisible(true);
  };

  const handleMarkAsCompleted = async () => {
    if (!selectedBook || !user?.uid) return;

    try {
      const updated = await libraryService.updateReadingProgress(
        user.uid,
        selectedBook.bookId,
        'completed',
        selectedBook.pagesCount,
        readingProgressEntry?.pointsEarned || false
      );
      
      // Update local state
      setProgress(prev => {
        const filtered = prev.filter(p => p.bookId !== selectedBook.bookId);
        return [...filtered, updated];
      });
      setReadingProgressEntry(updated);
      showToast(
        i18n.language === 'ta' 
          ? `வாழ்த்துக்கள்! ${selectedBook.readingPoints} புள்ளிகள் பெற்றீர்கள்!`
          : `Congratulations! You earned ${selectedBook.readingPoints} XP!`,
        'success'
      );
    } catch (err) {
      showToast('Failed to log completion.', 'error');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Are you sure you want to delete this book?');
      if (!confirm) return;
    }

    try {
      await libraryService.deleteBook(bookId);
      setBooks(prev => prev.filter(b => b.bookId !== bookId));
      showToast('Book deleted successfully.', 'success');
      setDetailModalVisible(false);
    } catch (err) {
      showToast('Failed to delete book.', 'error');
    }
  };

  const handlePickCover = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setCoverFile({ name: file.name, base64: reader.result as string });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const DocumentPicker = require('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const FileSystem = require('expo-file-system');
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        setCoverFile({ name: asset.name, base64: `data:${asset.mimeType || 'image/jpeg'};base64,${base64}` });
      }
    }
  };

  const handlePickPdf = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setPdfFile({ name: file.name, base64: reader.result as string });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const DocumentPicker = require('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const FileSystem = require('expo-file-system');
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        setPdfFile({ name: asset.name, base64: `data:application/pdf;base64,${base64}` });
      }
    }
  };

  const handleAddBookSubmit = async () => {
    if (!bookTitleEn.trim() || !bookTitleTa.trim() || !bookAuthor.trim()) {
      showToast('Please enter title and author details.', 'warning');
      return;
    }

    setSubmittingBook(true);
    try {
      const metadata = {
        title: { en: bookTitleEn, ta: bookTitleTa },
        author: bookAuthor,
        gradeLevel: bookGrade,
        category: bookCategory,
        description: { en: bookDescEn || bookTitleEn, ta: bookDescTa || bookTitleTa },
        readingPoints: Number(bookPoints) || 50,
        pagesCount: Number(bookPages) || 10
      };

      const added = await libraryService.uploadBook(
        metadata,
        pdfFile || undefined,
        coverFile || undefined
      );

      setBooks(prev => [added, ...prev]);
      showToast('Book added successfully!', 'success');
      setUploadModalVisible(false);
      resetForm();
    } catch (err) {
      showToast('Failed to add book.', 'error');
    } finally {
      setSubmittingBook(false);
    }
  };

  const resetForm = () => {
    setBookTitleEn('');
    setBookTitleTa('');
    setBookAuthor('');
    setBookGrade('KG');
    setBookCategory('textbook');
    setBookPages('');
    setBookPoints('50');
    setBookDescEn('');
    setBookDescTa('');
    setCoverFile(null);
    setPdfFile(null);
  };

  const handleOpenPdfReader = () => {
    if (!selectedBook) return;
    
    // Log progress as reading
    if (user?.uid) {
      libraryService.updateReadingProgress(user.uid, selectedBook.bookId, 'reading', 1, readingProgressEntry?.pointsEarned || false)
        .then(updated => {
          setProgress(prev => {
            const filtered = prev.filter(p => p.bookId !== selectedBook.bookId);
            return [...filtered, updated];
          });
          setReadingProgressEntry(updated);
        });
    }

    if (selectedBook.pdfUrl === 'interactive_thirukkural') {
      setThirukuralVisible(true);
      return;
    }

    if (Platform.OS === 'web') {
      setPdfReaderVisible(true);
    } else {
      const WebBrowser = require('expo-web-browser');
      WebBrowser.openBrowserAsync(selectedBook.pdfUrl);
    }
  };

  // Filter books based on search query, grade, and category
  const filteredBooks = books.filter(b => {
    const titleMatch = b.title.en.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       b.title.ta.includes(searchQuery) ||
                       b.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const gradeMatch = selectedGrade === 'All' || b.gradeLevel === selectedGrade;
    const categoryMatch = selectedCategory === 'All' || b.category === selectedCategory;

    return titleMatch && gradeMatch && categoryMatch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'textbook': return { bg: '#EBF4FF', text: '#2B6CB0' };
      case 'workbook': return { bg: '#FEF3C7', text: '#D97706' };
      case 'storybook': return { bg: '#ECFDF5', text: '#059669' };
      case 'audio': return { bg: '#FDF2F8', text: '#DB2777' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.four }}>
      {/* Header Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four }}>
        <View style={{ gap: 4 }}>
          <ThemedText style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>
            📚 {i18n.language === 'ta' ? 'பள்ளி நூலகம்' : 'School Digital Library'}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
            {i18n.language === 'ta' ? 'மாணவர்களுக்கான தமிழ்ப் புத்தகங்கள் மற்றும் பாடங்கள்' : 'Tamil textbooks and storybooks from KG to Year 9'}
          </ThemedText>
        </View>

        {['admin', 'superadmin', 'teacher'].includes(user?.role || '') && (
          <Pressable
            onPress={() => setUploadModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.primary,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10
            }}
          >
            <Plus size={14} color="#FFF" />
            <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
              Add Book
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Search Input */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        height: 44,
        marginBottom: Spacing.three
      }}>
        <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          placeholder={i18n.language === 'ta' ? 'புத்தகங்களைத் தேடுங்கள்...' : 'Search by title, author...'}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, color: colors.text, fontSize: 13 }}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Grade Selector Pills */}
      <View style={{ marginBottom: Spacing.three }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
          {gradeLevels.map((g) => {
            const isSelected = selectedGrade === g;
            return (
              <Pressable
                key={g}
                onPress={() => setSelectedGrade(g)}
                style={{
                  backgroundColor: isSelected ? colors.primary : colors.cardBg,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20
                }}
              >
                <ThemedText style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isSelected ? '#FFF' : colors.text
                }}>{g === 'All' ? (i18n.language === 'ta' ? 'அனைத்தும்' : 'All') : g}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Toggles */}
      <View style={{ marginBottom: Spacing.four }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
          {categories.map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <Pressable
                key={c}
                onPress={() => setSelectedCategory(c)}
                style={{
                  backgroundColor: isSelected ? colors.secondary : colors.cardBg,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.secondary : colors.border,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8
                }}
              >
                <ThemedText style={{
                  fontSize: 10,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: isSelected ? '#FFF' : colors.textSecondary
                }}>
                  {c === 'All' ? (i18n.language === 'ta' ? 'வகை' : 'All') : c}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Books Grid */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={{ marginTop: 8, color: colors.textSecondary }}>Loading Library...</ThemedText>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <BookOpen size={48} color={colors.border} />
          <ThemedText style={{ color: colors.textSecondary, fontWeight: '700' }}>No books found.</ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {filteredBooks.map((book) => {
              const bookProg = progress.find(p => p.bookId === book.bookId);
              const isCompleted = bookProg?.status === 'completed';
              const catTheme = getCategoryColor(book.category);
              const cardWidth = isLargeScreen ? '23%' : '47%';

              return (
                <Pressable
                  key={book.bookId}
                  onPress={() => handleSelectBook(book)}
                  style={{
                    width: cardWidth,
                    backgroundColor: colors.cardBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    padding: Spacing.two,
                    gap: 8,
                    shadowColor: colors.shadowColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.02,
                    shadowRadius: 4,
                    elevation: 1
                  }}
                >
                  <View style={{ width: '100%', height: 130, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.background, position: 'relative' }}>
                    <Image
                      source={{ uri: book.coverUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    
                    {/* Completion Check Circle overlay */}
                    {isCompleted && (
                      <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF', borderRadius: 10, padding: 1 }}>
                        <CheckCircle size={16} color="#059669" />
                      </View>
                    )}

                    {/* Grade Level Tag */}
                    <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '900' }}>{book.gradeLevel}</ThemedText>
                    </View>
                  </View>

                  <View style={{ gap: 2 }}>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: catTheme.bg, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                      <ThemedText style={{ color: catTheme.text, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>
                        {book.category}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                      {i18n.language === 'ta' ? book.title.ta : book.title.en}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>
                      {book.author}
                    </ThemedText>
                  </View>

                  {/* XP Points Indicator */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Award size={10} color={colors.secondary} />
                      <ThemedText style={{ fontSize: 9, fontWeight: '800', color: colors.secondary }}>
                        {book.readingPoints} XP
                      </ThemedText>
                    </View>
                    {bookProg?.status === 'reading' && (
                      <ThemedText style={{ fontSize: 8, color: colors.primary, fontWeight: '700' }}>Reading</ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Book Details Modal */}
      {selectedBook && (
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four }}>
            <View style={{ width: isLargeScreen ? 480 : '100%', backgroundColor: colors.cardBg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              
              {/* Cover Header Graphic */}
              <View style={{ height: 160, position: 'relative', backgroundColor: colors.background }}>
                <Image
                  source={{ uri: selectedBook.coverUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
                
                <Pressable
                  onPress={() => setDetailModalVisible(false)}
                  style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 6 }}
                >
                  <X size={16} color="#FFF" />
                </Pressable>

                <View style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                    <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>
                      {selectedBook.category} • {selectedBook.gradeLevel}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>
                    {i18n.language === 'ta' ? selectedBook.title.ta : selectedBook.title.en}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#E2E8F0' }}>
                    By {selectedBook.author}
                  </ThemedText>
                </View>
              </View>

              {/* Description & Metadata */}
              <ScrollView style={{ padding: Spacing.four, maxHeight: 220 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  {i18n.language === 'ta' ? 'விளக்கம்' : 'Description'}
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginBottom: Spacing.three }}>
                  {i18n.language === 'ta' ? selectedBook.description.ta : selectedBook.description.en}
                </ThemedText>

                {selectedBook.audioUrl && (
                  Platform.OS === 'web' ? (
                    <audio
                      src={selectedBook.audioUrl}
                      controls
                      style={{ width: '100%', marginTop: 4, marginBottom: 12 }}
                    />
                  ) : (
                    <ThemedText style={{ fontSize: 11, color: colors.secondary, fontStyle: 'italic', marginBottom: 12 }}>
                      {i18n.language === 'ta' ? 'ஆடியோ கேட்க "உடனே படி" அழுத்தவும்.' : 'Press "Read Online" to open the lyrics and audio.'}
                    </ThemedText>
                  )
                )}

                <View style={{ flexDirection: 'row', gap: 12, borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>Pages</ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{selectedBook.pagesCount} pgs</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>Award XP</ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: colors.secondary }}>{selectedBook.readingPoints} XP</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>Status</ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: readingProgressEntry?.status === 'completed' ? '#059669' : colors.textSecondary }}>
                      {readingProgressEntry?.status === 'completed' ? 'Completed' : (readingProgressEntry?.status === 'reading' ? 'Reading' : 'Not Started')}
                    </ThemedText>
                  </View>
                </View>
              </ScrollView>

              {/* Action Footer */}
              <View style={{ padding: Spacing.four, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
                <Pressable
                  onPress={handleOpenPdfReader}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: colors.primary,
                    paddingVertical: 10,
                    borderRadius: 10
                  }}
                >
                  <Book size={14} color="#FFF" />
                  <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                    {i18n.language === 'ta' ? 'உடனே படி (Read Online)' : 'Read Online'}
                  </ThemedText>
                </Pressable>

                {user?.role === 'student' && readingProgressEntry?.status !== 'completed' && (
                  <Pressable
                    onPress={handleMarkAsCompleted}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: colors.secondary,
                      paddingVertical: 10,
                      borderRadius: 10
                    }}
                  >
                    <CheckCircle size={14} color="#FFF" />
                    <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                      {i18n.language === 'ta' ? 'முடித்துவிட்டேன் (Mark Completed)' : 'Mark Completed'}
                    </ThemedText>
                  </Pressable>
                )}

                {/* Delete button (Admin/Teacher only) */}
                {['admin', 'superadmin', 'teacher'].includes(user?.role || '') && (
                  <Pressable
                    onPress={() => handleDeleteBook(selectedBook.bookId)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: '#FF8A8A',
                      paddingVertical: 8,
                      borderRadius: 10,
                      marginTop: 4
                    }}
                  >
                    <Trash2 size={13} color="#FF6B6B" />
                    <ThemedText style={{ color: '#FF6B6B', fontSize: 11, fontWeight: '800' }}>
                      Delete Book
                    </ThemedText>
                  </Pressable>
                )}
              </View>

            </View>
          </View>
        </Modal>
      )}

      {/* Inline Web PDF Reader Modal */}
      {selectedBook && Platform.OS === 'web' && (
        <Modal
          visible={pdfReaderVisible}
          animationType="fade"
          onRequestClose={() => setPdfReaderVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#1A202C' }}>
            {/* Header bar */}
            <View style={{ height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#2D3748', backgroundColor: '#2D3748' }}>
              <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>
                {i18n.language === 'ta' ? selectedBook.title.ta : selectedBook.title.en}
              </ThemedText>
              <Pressable onPress={() => setPdfReaderVisible(false)} style={{ padding: 6 }}>
                <X size={18} color="#FFF" />
              </Pressable>
            </View>

            {/* Document Frame */}
            <View style={{ flex: 1 }}>
              <iframe
                src={selectedBook.pdfUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Interactive Thirukkural Explorer Modal */}
      {selectedBook && selectedBook.pdfUrl === 'interactive_thirukkural' && (
        <Modal
          visible={thirukuralVisible}
          animationType="slide"
          onRequestClose={() => setThirukuralVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header bar */}
            <View style={{ height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg }}>
              <ThemedText style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
                Thirukkural Explorer / திருக்குறள் உலகப் பொதுமறை
              </ThemedText>
              <Pressable onPress={() => setThirukuralVisible(false)} style={{ padding: 6 }}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* Main Interactive Guide Component */}
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <ThirukkuralPracticeGuide 
                colors={colors} 
                i18n={i18n} 
                showToast={showToast} 
              />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Add/Upload Book Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four }}>
          <View style={{ width: isLargeScreen ? 500 : '100%', backgroundColor: colors.cardBg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
              <ThemedText style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Add New Book to Library</ThemedText>
              <Pressable onPress={() => setUploadModalVisible(false)} style={{ padding: 4 }}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Fields Form */}
            <ScrollView style={{ padding: Spacing.four, maxHeight: 400 }}>
              <View style={{ gap: Spacing.three }}>
                
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Title (English)*</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={bookTitleEn}
                    onChangeText={setBookTitleEn}
                    placeholder="e.g. Tamil Class Reader Term 1"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Title (Tamil)*</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={bookTitleTa}
                    onChangeText={setBookTitleTa}
                    placeholder="எ.கா. தமிழ்ப் பாடப்புத்தகம் பருவம் 1"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Author*</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={bookAuthor}
                      onChangeText={setBookAuthor}
                      placeholder="Author name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Grade Level*</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
                      {gradeLevels.filter(g => g !== 'All').map(g => {
                        const isSelected = bookGrade === g;
                        return (
                          <Pressable
                            key={g}
                            onPress={() => setBookGrade(g)}
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.background,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.primary : colors.border,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4
                            }}
                          >
                            <ThemedText style={{ fontSize: 9, fontWeight: '700', color: isSelected ? '#FFF' : colors.text }}>{g}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Category*</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
                      {categories.filter(c => c !== 'All').map(c => {
                        const isSelected = bookCategory === c;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => setBookCategory(c as any)}
                            style={{
                              backgroundColor: isSelected ? colors.secondary : colors.background,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.secondary : colors.border,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4
                            }}
                          >
                            <ThemedText style={{ fontSize: 8, fontWeight: '700', textTransform: 'uppercase', color: isSelected ? '#FFF' : colors.textSecondary }}>{c}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Pages Count</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={bookPages}
                      onChangeText={setBookPages}
                      placeholder="e.g. 32"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>XP Award points</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={bookPoints}
                      onChangeText={setBookPoints}
                      placeholder="e.g. 50"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Description (English)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 60, textAlignVertical: 'top' }]}
                    value={bookDescEn}
                    onChangeText={setBookDescEn}
                    placeholder="Short English description..."
                    multiline
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Description (Tamil)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 60, textAlignVertical: 'top' }]}
                    value={bookDescTa}
                    onChangeText={setBookDescTa}
                    placeholder="புத்தக விளக்கம்..."
                    multiline
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* File Pickers */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Pressable
                    onPress={handlePickCover}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: coverFile ? colors.secondary : colors.border,
                      padding: 10,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: coverFile ? colors.secondary : colors.textSecondary }}>
                      {coverFile ? `Cover: ${coverFile.name.substring(0, 12)}...` : '📷 Pick Cover Image'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handlePickPdf}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: pdfFile ? colors.primary : colors.border,
                      padding: 10,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: pdfFile ? colors.primary : colors.textSecondary }}>
                      {pdfFile ? `PDF: ${pdfFile.name.substring(0, 12)}...` : '📄 Pick PDF Book'}
                    </ThemedText>
                  </Pressable>
                </View>

              </View>
            </ScrollView>

            {/* Actions footer */}
            <View style={{ flexDirection: 'row', gap: 10, padding: Spacing.four, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
              <Pressable
                onPress={() => setUploadModalVisible(false)}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
              >
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                onPress={handleAddBookSubmit}
                disabled={submittingBook}
                style={{
                  flex: 2,
                  backgroundColor: colors.primary,
                  paddingVertical: 10,
                  borderRadius: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 6
                }}
              >
                {submittingBook ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CheckCircle size={14} color="#FFF" />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>Save Book</ThemedText>
                  </>
                )}
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}
