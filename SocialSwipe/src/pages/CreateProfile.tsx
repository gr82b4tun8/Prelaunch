// src/pages/CreateProfile.tsx (MODIFIED for Pre-Launch)

import React, { useState, useEffect, useCallback } from 'react';
import {
    SafeAreaView, View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Image, Platform, Alert, StyleSheet, TouchableOpacity,
    StatusBar // Ensure StatusBar is imported
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values'; // Correct import for uuid
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { RootStackParamList } from '../../App'; // Adjust path as needed
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- Constant for Max Photos (from EditProfileScreen) ---
const MAX_PROFILE_PHOTOS = 6;

// --- Schema and Types (Assuming definition exists elsewhere) ---
const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    dob: z.date({ required_error: "Date of birth is required" }).max(new Date(), { message: "Date of birth cannot be in the future" }), // Added max date validation
    gender: z.string().min(1, "Gender is required").refine(value => value !== 'SELECT_GENDER_PLACEHOLDER', { message: "Gender is required" }), // Ensure placeholder isn't submitted
    bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
    location: z.string().optional(),
    lookingFor: z.string().optional().refine(value => value !== 'SELECT_LOOKINGFOR_PLACEHOLDER' || value === undefined || value === null || value === '', { message: "Please select an option for looking for or leave empty" }), // Adjust validation for optional placeholder
});
type ProfileFormData = z.infer<typeof profileSchema>;
// Using 'CreateProfile' as per your provided code for this file.
// If your App.tsx uses 'CreateProfileScreen', ensure this matches.
type CreateProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateProfile'>;


// Define placeholder constants
const SELECT_GENDER_PLACEHOLDER = "SELECT_GENDER_PLACEHOLDER";
const SELECT_LOOKINGFOR_PLACEHOLDER = "SELECT_LOOKINGFOR_PLACEHOLDER";

// Define gradient colors (you can change these)
const PAGE_GRADIENT_COLORS = ['#fe9494', '#00008b'];
const SECTION_GRADIENT_COLORS = ['#00008b', '#fe9494'];
const LOADING_GRADIENT_COLORS = ['#fe9494', '#00008b'];

const CreateProfile: React.FC = () => {
    const navigation = useNavigation<CreateProfileNavigationProp>();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [profileImages, setProfileImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            dob: undefined,
            gender: SELECT_GENDER_PLACEHOLDER,
            bio: '',
            location: '',
            lookingFor: SELECT_LOOKINGFOR_PLACEHOLDER,
        }
    });
    const { handleSubmit, control, formState: { errors }, reset, setValue, watch } = form;
    const dobValue = watch("dob");

    const checkExistingProfile = useCallback(async (currentUserId: string) => {
        console.log("[checkExistingProfile] Starting check for user:", currentUserId);
        try {
            const { data, error } = await supabase
                .from('individual_profiles')
                .select('user_id, is_profile_complete')
                .eq('user_id', currentUserId)
                .maybeSingle();
            console.log("[checkExistingProfile] After Supabase call. Data:", data, "Error:", error);
            if (error && error.code !== 'PGRST116') {
                console.error('[checkExistingProfile] Supabase query error:', error);
                throw error;
            }
            if (data?.user_id && data?.is_profile_complete) {
                console.warn('[checkExistingProfile] Complete individual profile found. App.tsx should handle navigation.');
                return true;
            }
            console.log("[checkExistingProfile] No complete individual profile data found.");
            return false;
        } catch (err: any) {
            console.error('[checkExistingProfile] CATCH block:', err);
            Toast.show({ type: 'error', text1: 'Error checking profile', text2: err.message });
            return false;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchUser = async () => {
            setLoading(true);
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (!isMounted) return;
                if (error) throw error;

                if (user) {
                    console.log("[CreateProfile useEffect] User found:", user.id);
                    setUserId(user.id);
                    const profileFound = await checkExistingProfile(user.id);
                    if (isMounted && !profileFound) {
                        console.log("[CreateProfile useEffect] Complete profile not found, setting loading=false");
                        setLoading(false);
                    } else if (isMounted && profileFound) {
                        console.log("[CreateProfile useEffect] Complete profile found, App.tsx should prevent rendering this screen.");
                        // setLoading(false); // Potentially keep loading or handle navigation if app structure expects it
                    }
                } else {
                    if (!isMounted) return;
                    console.warn("[CreateProfile useEffect] No user found.");
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No active session. Please log in.' });
                    setLoading(false);
                }
            } catch (error: any) {
                if (!isMounted) return;
                console.error('[CreateProfile useEffect] Error fetching user:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'Could not fetch user session.' });
                setLoading(false);
            }
        };
        fetchUser();
        return () => { isMounted = false; };
    }, [checkExistingProfile]);

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate || dobValue;
        setShowDatePicker(Platform.OS === 'ios');
        if (currentDate) {
            const today = new Date();
            const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
            if (currentDate > eighteenYearsAgo) {
                Toast.show({ type: 'error', text1: 'Invalid Date of Birth', text2: 'You must be at least 18 years old.' });
                if (Platform.OS !== 'ios') { setShowDatePicker(false); }
                setValue('dob', undefined, { shouldValidate: true });
            } else if (currentDate > new Date()) {
                Toast.show({ type: 'error', text1: 'Invalid Date of Birth', text2: 'Date of birth cannot be in the future.' });
                if (Platform.OS !== 'ios') { setShowDatePicker(false); }
                setValue('dob', undefined, { shouldValidate: true });
            } else {
                setValue('dob', currentDate, { shouldValidate: true });
                if (Platform.OS !== 'ios') { setShowDatePicker(false); }
            }
        } else {
            if (Platform.OS !== 'ios') { setShowDatePicker(false); }
        }
    };

    const pickImage = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }
        }
        if (profileImages.length >= MAX_PROFILE_PHOTOS) {
            Toast.show({ type: 'info', text1: 'Limit Reached', text2: `Max ${MAX_PROFILE_PHOTOS} photos allowed.` });
            return;
        }

        try {
            const selectionLimit = MAX_PROFILE_PHOTOS - profileImages.length;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                // allowsEditing: true, // This is incompatible with allowsMultipleSelection on iOS
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: selectionLimit > 0 ? selectionLimit : 1,
            });

            if (!result.canceled && result.assets) {
                const newImages = result.assets.filter(newAsset => !profileImages.some(existingAsset => existingAsset.uri === newAsset.uri));
                const combinedImages = [...profileImages, ...newImages].slice(0, MAX_PROFILE_PHOTOS);
                setProfileImages(combinedImages);
            }
        } catch (error) {
            console.error("ImagePicker Error: ", error);
            Toast.show({ type: 'error', text1: 'Image Error', text2: 'Could not pick images.' });
        }
    };

    const removeImage = (uriToRemove: string) => {
        setProfileImages(currentImages => currentImages.filter(image => image.uri !== uriToRemove));
    };

    const addInterest = () => {
        const trimmedInput = interestInput.trim();
        if (trimmedInput && !interests.includes(trimmedInput) && interests.length < 10) {
            setInterests([...interests, trimmedInput]);
            setInterestInput('');
        } else if (interests.includes(trimmedInput)) {
            Toast.show({ type: 'info', text1: 'Interest already added' });
        } else if (interests.length >= 10) {
            Toast.show({ type: 'info', text1: 'Maximum interests reached' });
        }
    };

    const removeInterest = (interestToRemove: string) => {
        setInterests(currentInterests => currentInterests.filter(interest => interest !== interestToRemove));
    };

    const onSubmit = async (values: ProfileFormData) => {
        if (!userId) {
            Toast.show({ type: 'error', text1: 'User Error', text2: 'User ID not found. Cannot submit.' });
            return;
        }
        if (profileImages.length === 0) {
            Toast.show({ type: 'error', text1: 'Image Required', text2: 'Please upload at least one profile picture.' });
            return;
        }
        if (!values.dob || !(values.dob instanceof Date) || isNaN(values.dob.getTime())) {
            Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Please select a valid date of birth.' });
            return;
        }
        const today = new Date(); const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        if (values.dob > eighteenYearsAgo) {
            Toast.show({ type: 'error', text1: 'Age Restriction', text2: 'You must be at least 18 years old.' });
            return;
        }
        if (values.gender === SELECT_GENDER_PLACEHOLDER) {
            Toast.show({ type: 'error', text1: 'Gender Required', text2: 'Please select your gender.' });
            return;
        }
        
        setIsSubmitting(true);
        const uploadedImageUrls: string[] = [];
        try {
            Toast.show({ type: 'info', text1: 'Uploading images...' });

            for (const asset of profileImages) {
                const uri = asset.uri;
                const response = await fetch(uri);
                if (!response.ok) throw new Error(`Failed to fetch image URI (${response.status})`);
                
                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength === 0) throw new Error("Cannot upload empty image file.");

                const contentType = response.headers.get('content-type') ?? asset.mimeType ?? 'application/octet-stream';
                const fileExtFromAsset = asset.fileName?.split('.').pop()?.toLowerCase();
                const fileExtFromUri = uri.split('.').pop()?.toLowerCase()?.split('?')[0];
                const fileExtFromMime = contentType.split('/')[1]?.split('+')[0];
                const fileExt = fileExtFromAsset || fileExtFromMime || fileExtFromUri || 'jpg';
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile_pictures')
                    .upload(filePath, arrayBuffer, { contentType, upsert: false });

                if (uploadError) throw new Error(`Upload failed for ${fileName}: ${uploadError.message}`);
                
                const { data: urlData } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
                
                if (!urlData?.publicUrl) {
                    Toast.show({ type: 'warning', text1: 'URL Issue', text2: `Could not get public URL for ${fileName}.`});
                } else {
                    uploadedImageUrls.push(urlData.publicUrl);
                }
            }

            if (uploadedImageUrls.length < profileImages.length) {
                 Toast.show({ type: 'warning', text1: "Some images failed", text2: "Not all images could be processed." });
            } else {
                Toast.show({ type: 'success', text1: 'Images uploaded!' });
            }

            const actualLookingFor = values.lookingFor === SELECT_LOOKINGFOR_PLACEHOLDER ? null : values.lookingFor;
            const profileData = {
                user_id: userId,
                first_name: values.firstName,
                last_name: values.lastName || null,
                date_of_birth: format(values.dob, 'yyyy-MM-dd'),
                gender: values.gender,
                bio: values.bio || null,
                interests: interests.length > 0 ? interests : null,
                location: values.location || null,
                looking_for: actualLookingFor,
                profile_pictures: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
                updated_at: new Date().toISOString(),
                is_profile_complete: true,
            };
            
            console.log("Attempting to save profile data to individual_profiles:", profileData);
            Toast.show({ type: 'info', text1: 'Saving profile...' });
            
            const { error: upsertError } = await supabase.from('individual_profiles').upsert(profileData, { onConflict: 'user_id' });
            if (upsertError) {
                console.error("Upsert error details:", upsertError);
                throw upsertError;
            }
            
            Toast.show({ type: 'success', text1: 'Profile Created!', text2: 'Your profile is set up.' });
            reset({ firstName: '', lastName: '', dob: undefined, gender: SELECT_GENDER_PLACEHOLDER, bio: '', location: '', lookingFor: SELECT_LOOKINGFOR_PLACEHOLDER, });
            setInterests([]);
            setProfileImages([]);
            setInterestInput('');
            console.log("[CreateProfile onSubmit] Profile saved. App.tsx should detect is_profile_complete=true and handle redirection.");
            
        } catch (error: any) {
            console.error('Create Profile Error:', error);
            let errorMessage = 'An unexpected error occurred.';
            if (error instanceof z.ZodError) {
                errorMessage = Object.values(error.flatten().fieldErrors).flat().join('. ');
            } else if (error.message) {
                errorMessage = error.message;
            }
            Toast.show({ type: 'error', text1: 'Error Creating Profile', text2: errorMessage, });
        } finally {
            setIsSubmitting(false);
            console.log("[CreateProfile onSubmit] Submission process finished (finally block).");
        }
    };

    if (loading) {
        return (
            <View style={styles.fullScreenContainer}>
                <StatusBar animated={true} backgroundColor="transparent" translucent={true} barStyle="light-content" />
                <LinearGradient
                    colors={LOADING_GRADIENT_COLORS}
                    style={StyleSheet.absoluteFillObject} // Fills the parent View
                />
                {/* SafeAreaView for content alignment, uses a style that centers content */}
                <SafeAreaView style={styles.centeredContentSafeArea}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>Loading Profile...</Text>
                </SafeAreaView>
            </View>
        );
    }

    if (!userId && !loading) {
        return (
            <View style={styles.fullScreenContainer}>
                <StatusBar animated={true} backgroundColor="transparent" translucent={true} barStyle="light-content" />
                <LinearGradient
                    colors={LOADING_GRADIENT_COLORS}
                    style={StyleSheet.absoluteFillObject} // Fills the parent View
                />
                {/* SafeAreaView for content alignment, uses a style that centers content */}
                <SafeAreaView style={styles.centeredContentSafeArea}>
                    <Text style={styles.centeredErrorText}>User session not found.</Text>
                    <Text style={styles.centeredErrorText}>Please restart the app or log in again.</Text>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar
                animated={true}
                backgroundColor="transparent"
                translucent={true}
                barStyle="light-content"
            />
            <LinearGradient
                colors={PAGE_GRADIENT_COLORS}
                style={StyleSheet.absoluteFillObject} // Fills the parent View
            />
            <SafeAreaView style={styles.contentSafeArea}>
                <ScrollView
                    style={styles.scrollView} // Should have transparent background
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.header}>Create Your Profile</Text>
                    <Text style={styles.subHeader}>Let's get you set up!</Text>

                    {/* Personal Information Section */}
                    <LinearGradient colors={SECTION_GRADIENT_COLORS} style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Info</Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>First Name *</Text>
                            <Controller control={control} name="firstName" render={({ field: { onChange, onBlur, value } }) => ( <TextInput style={[styles.input, errors.firstName && styles.inputError]} placeholder="Enter your first name" onBlur={onBlur} onChangeText={onChange} value={value} /> )}/>
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Last Name</Text>
                            <Controller control={control} name="lastName" render={({ field: { onChange, onBlur, value } }) => ( <TextInput style={styles.input} placeholder="Enter your last name (optional)" onBlur={onBlur} onChangeText={onChange} value={value || ''} /> )}/>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Date of Birth *</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                                <View style={[styles.input, styles.datePickerInput, errors.dob && styles.inputError]} pointerEvents="none">
                                    <Text style={[styles.datePickerText, !dobValue && styles.pickerPlaceholder]}>{dobValue ? format(dobValue, 'MM/dd/yyyy') : 'MM/DD/YYYY'}</Text>
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (<DateTimePicker testID="dateTimePicker" value={dobValue || new Date(new Date().setFullYear(new Date().getFullYear() - 18))} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))} /> )}
                            {Platform.OS === 'ios' && showDatePicker && (<Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDoneButton}><Text style={styles.datePickerDoneButtonText}>Done</Text></Pressable>)}
                            {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Gender *</Text>
                            <Controller control={control} name="gender" render={({ field: { onChange, value } }) => ( <View style={[styles.pickerContainer, errors.gender && styles.inputError]}><Picker selectedValue={value} onValueChange={(itemValue) => onChange(itemValue)} style={styles.picker} prompt="Select your gender">
                                <Picker.Item label="Select Gender..." value={SELECT_GENDER_PLACEHOLDER} style={styles.pickerPlaceholderItem} />
                                <Picker.Item label="Man" value="Man" /><Picker.Item label="Woman" value="Woman" /><Picker.Item label="Non-binary" value="Non-binary" /><Picker.Item label="Other" value="Other" /><Picker.Item label="Prefer not to say" value="Prefer not to say" />
                            </Picker></View> )}/>
                            {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
                        </View>
                    </LinearGradient>

                    {/* About You Section */}
                    <LinearGradient colors={SECTION_GRADIENT_COLORS} style={styles.section}>
                        <Text style={styles.sectionTitle}>About You</Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <Controller control={control} name="bio" render={({ field: { onChange, onBlur, value } }) => ( <TextInput style={[styles.input, styles.textArea, errors.bio && styles.inputError]} placeholder="Tell us a little about yourself (optional)" onBlur={onBlur} onChangeText={onChange} value={value || ''} multiline numberOfLines={4} /> )}/>
                            {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Interests (up to 10)</Text>
                            <View style={styles.interestInputContainer}><TextInput style={styles.interestInput} placeholder="Add an interest (e.g., hiking, coding)" value={interestInput} onChangeText={setInterestInput} onSubmitEditing={addInterest} />
                                <Pressable onPress={addInterest} style={[styles.addButton, (!interestInput.trim() || interests.length >= 10) && styles.disabledButton]} disabled={!interestInput.trim() || interests.length >= 10}><Text style={styles.addButtonText}>Add</Text></Pressable>
                            </View>
                            <View style={styles.badgeContainer}>{interests.map((interest) => (<View key={interest} style={styles.badge}><Text style={styles.badgeText}>{interest}</Text><Pressable onPress={() => removeInterest(interest)} style={styles.removeBadgeButton}><Text style={styles.removeBadgeText}>✕</Text></Pressable></View>))}</View>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Location</Text>
                            <Controller control={control} name="location" render={({ field: { onChange, onBlur, value } }) => ( <TextInput style={styles.input} placeholder="Your city or neighborhood (optional)" onBlur={onBlur} onChangeText={onChange} value={value || ''} /> )}/>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Looking For</Text>
                            <Controller control={control} name="lookingFor" render={({ field: { onChange, value } }) => ( <View style={styles.pickerContainer}><Picker selectedValue={value} onValueChange={(itemValue) => onChange(itemValue)} style={styles.picker} prompt="What are you looking for?">
                                <Picker.Item label="Select an option..." value={SELECT_LOOKINGFOR_PLACEHOLDER} style={styles.pickerPlaceholderItem} />
                                <Picker.Item label="Relationship" value="Relationship" /><Picker.Item label="Something Casual" value="Something Casual" /><Picker.Item label="Friendship" value="Friendship" /><Picker.Item label="Don't know yet" value="Don't know yet" />
                            </Picker></View> )}/>
                            {errors.lookingFor && <Text style={styles.errorText}>{errors.lookingFor.message}</Text>}
                        </View>
                    </LinearGradient>

                    {/* Profile Pictures Section */}
                    <LinearGradient colors={SECTION_GRADIENT_COLORS} style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Pictures *</Text>
                        <Text style={styles.label}>Upload up to {MAX_PROFILE_PHOTOS} photos. The first photo will be your main profile picture.</Text>
                        <View style={styles.imagePreviewContainer}>{profileImages.map((image) => (<View key={image.uri} style={styles.imagePreviewWrapper}><Image source={{ uri: image.uri }} style={styles.imagePreview} /><Pressable onPress={() => removeImage(image.uri)} style={styles.removeImageButton}><Text style={styles.removeImageText}>✕</Text></Pressable></View>))}</View>
                        {profileImages.length < MAX_PROFILE_PHOTOS && (<Pressable onPress={pickImage} style={[styles.uploadButton, isSubmitting && styles.disabledButton]} disabled={isSubmitting}><Text style={styles.uploadButtonText}>Add Photos</Text></Pressable>)}
                        {profileImages.length === 0 && errors.root?.message && (<Text style={styles.errorText}>{errors.root.message}</Text> )}
                    </LinearGradient>

                    {/* Submit Button */}
                    <Pressable style={[styles.submitButton, (isSubmitting || profileImages.length === 0) && styles.disabledButton]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting || profileImages.length === 0}>
                        {isSubmitting ? (<ActivityIndicator size="small" color="#fff" style={styles.activityIndicator} />) : null}
                        <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving Profile...' : 'Create Profile'}</Text>
                    </Pressable>
                </ScrollView>
                <Toast />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: { // New style for the outermost View
        flex: 1,
    },
    contentSafeArea: { // For the main content SafeAreaView
        flex: 1,
        backgroundColor: 'transparent', // Ensure SafeAreaView is transparent
    },
    centeredContentSafeArea: { // For loading/error states SafeAreaView
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20, // Retain padding from original loadingContainer
    },
    safeArea: { // Original style, ensured transparent. May be consolidated if not used elsewhere.
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        padding: 20,
        paddingBottom: 60
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#FFFFFF'
    },
    centeredErrorText: { // ADDED for better visibility on gradient
        color: '#FFFFFF',
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
    header: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#FFFFFF' },
    subHeader: { fontSize: 16, color: '#E0E0E0', textAlign: 'center', marginBottom: 30 },
    section: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 3
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#FF6347' },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#495057' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, fontSize: 16, color: '#333', minHeight: 48, justifyContent: 'center' },
    inputError: { borderColor: '#dc3545' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    pickerContainer: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', minHeight: 48 },
    picker: { width: '100%', color: '#333', height: Platform.OS === 'ios' ? undefined : 48 },
    pickerPlaceholder: { color: '#999' },
    pickerPlaceholderItem: { color: '#999', fontSize: 16 },
    errorText: { // General form error text
        color: '#dc3545',
        fontSize: 13,
        marginTop: 6
    },
    interestInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    interestInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, fontSize: 16, minHeight: 48 },
    addButton: { backgroundColor: '#FF6347', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minHeight: 48 },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    disabledButton: { opacity: 0.5 },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9ecef', borderRadius: 15, paddingVertical: 6, paddingHorizontal: 12 },
    badgeText: { fontSize: 14, color: '#495057', marginRight: 6 },
    removeBadgeButton: { padding: 3, marginLeft: 'auto' },
    removeBadgeText: { fontSize: 14, color: '#6c757d', fontWeight: 'bold', lineHeight: 14 },
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginTop: 10, marginBottom: 15, minHeight: 48 },
    uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15, marginBottom: 10 },
    imagePreviewWrapper: { position: 'relative', width: 100, height: 100 },
    imagePreview: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    removeImageButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    removeImageText: { fontSize: 14, color: '#fff', fontWeight: 'bold', lineHeight: 14 },
    submitButton: { flexDirection: 'row', backgroundColor: '#FF6347', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 30, minHeight: 50 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    activityIndicator: { marginRight: 10 },
    datePickerInput: { justifyContent: 'center' },
    datePickerText: { fontSize: 16, color: '#333' },
    datePickerDoneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, backgroundColor: '#007AFF', borderRadius: 5 },
    datePickerDoneButtonText: { color: '#fff', fontWeight: '600' },
});

export default CreateProfile;