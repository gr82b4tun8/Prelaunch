// src/pages/CreateProfile.tsx (MODIFIED for Pre-Launch)

import React, { useState, useEffect, useCallback } from 'react';
import {
    // Keep other necessary imports
    SafeAreaView, View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Image, Platform, Alert, StyleSheet, TouchableOpacity
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native'; // Keep for potential future use
import { supabase } from '@/lib/supabaseClient'; // Adjust path if needed
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { format, parse } from 'date-fns'; // Added parse from date-fns
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; // Added DateTimePicker

import { RootStackParamList } from '../../App'; // Adjust path as needed
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- REMOVED useAuth import ---

// --- Schema and Types (Assuming definition exists elsewhere) ---
const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    dob: z.date({ required_error: "Date of birth is required" }).max(new Date(), { message: "Date of birth cannot be in the future" }), // Added max date validation
    gender: z.string().min(1, "Gender is required").refine(value => value !== 'SELECT_GENDER_PLACEHOLDER', { message: "Gender is required" }), // Ensure placeholder isn't submitted
    bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
    location: z.string().optional(),
    lookingFor: z.string().optional().refine(value => value !== 'SELECT_LOOKINGFOR_PLACEHOLDER' || value === undefined || value === null || value === '', { message: "Please select an option for looking for or leave empty" }), // Adjust validation for optional placeholder
    // interests and profile_pictures are handled separately
});
type ProfileFormData = z.infer<typeof profileSchema>;
type CreateProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateProfile'>;

// Define placeholder constants
const SELECT_GENDER_PLACEHOLDER = "SELECT_GENDER_PLACEHOLDER";
const SELECT_LOOKINGFOR_PLACEHOLDER = "SELECT_LOOKINGFOR_PLACEHOLDER";

const CreateProfile: React.FC = () => {
    const navigation = useNavigation<CreateProfileNavigationProp>(); // Keep hook instance
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [profileImages, setProfileImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false); // State for date picker visibility

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            dob: undefined,
            gender: SELECT_GENDER_PLACEHOLDER, // MODIFIED
            bio: '',
            location: '',
            lookingFor: SELECT_LOOKINGFOR_PLACEHOLDER, // MODIFIED
        }
    });
    const { handleSubmit, control, formState: { errors }, reset, setValue, watch } = form;
    const dobValue = watch("dob");

    // --- Safeguard Check (Checks individual_profiles) ---
    const checkExistingProfile = useCallback(async (currentUserId: string) => {
        console.log("[checkExistingProfile] Starting check for user:", currentUserId);
        try {
            console.log("[checkExistingProfile] Before Supabase call to individual_profiles");
            const { data, error } = await supabase
                .from('individual_profiles')
                .select('user_id, is_profile_complete') // Check completion flag too
                .eq('user_id', currentUserId)
                .maybeSingle();

            console.log("[checkExistingProfile] After Supabase call. Data:", data, "Error:", error);

            if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay here
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

    // --- Fetch User ID & Check Profile ---
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
                Toast.show({
                    type: 'error',
                    text1: 'Invalid Date of Birth',
                    text2: 'You must be at least 18 years old.',
                });
                if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                }
                setValue('dob', undefined, { shouldValidate: true });
            } else if (currentDate > new Date()) {
                Toast.show({
                    type: 'error',
                    text1: 'Invalid Date of Birth',
                    text2: 'Date of birth cannot be in the future.',
                });
                if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                }
                setValue('dob', undefined, { shouldValidate: true });
            }
            else {
                setValue('dob', currentDate, { shouldValidate: true });
                if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                }
            }
        } else {
            if (Platform.OS !== 'ios') {
                setShowDatePicker(false);
            }
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
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: 6 - profileImages.length,
            });
            if (!result.canceled && result.assets) {
                const newImages = result.assets.filter(newAsset =>
                    !profileImages.some(existingAsset => existingAsset.uri === newAsset.uri)
                );
                const combinedImages = [...profileImages, ...newImages].slice(0, 6);
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
        if (!values.dob || !(values.dob instanceof Date) || isNaN(values.dob.getTime())) {
            Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Please select a valid date of birth.' });
            setIsSubmitting(false);
            return;
        }
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        if (values.dob > eighteenYearsAgo) {
            Toast.show({
                type: 'error',
                text1: 'Age Restriction',
                text2: 'You must be at least 18 years old to create a profile.',
            });
            setIsSubmitting(false);
            return;
        }
        if (!userId) {
            Toast.show({ type: 'error', text1: 'User Error', text2: 'User ID not found. Cannot submit.' });
            setIsSubmitting(false);
            return;
        }
        if (profileImages.length === 0) {
            Toast.show({ type: 'error', text1: 'Image Required', text2: 'Please upload at least one profile picture.' });
            setIsSubmitting(false);
            return;
        }

        // Ensure placeholder values are not submitted for gender and lookingFor if they are still the placeholder
        if (values.gender === SELECT_GENDER_PLACEHOLDER) {
             Toast.show({ type: 'error', text1: 'Gender Required', text2: 'Please select your gender.' });
             setIsSubmitting(false);
             return;
        }
        // For lookingFor, it's optional, so if it's still the placeholder, treat it as null or not set.
        // The schema's .optional() should handle it if we transform placeholder to null.
        const actualLookingFor = values.lookingFor === SELECT_LOOKINGFOR_PLACEHOLDER ? null : values.lookingFor;


        setIsSubmitting(true);
        let uploadedImagePaths: string[] = [];

        try {
            Toast.show({ type: 'info', text1: 'Uploading images...' });
            for (const imageAsset of profileImages) {
                const uri = imageAsset.uri;
                if (uri.includes('supabase.co/storage')) {
                    const urlParts = uri.split('/profile_pictures/');
                    if (urlParts.length > 1) {
                        uploadedImagePaths.push(urlParts[1]);
                        continue;
                    }
                }
                const response = await fetch(uri);
                const blob = await response.blob();
                const fileExt = imageAsset.mimeType?.split('/')[1] || uri.split('.').pop() || 'jpg';
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile_pictures')
                    .upload(filePath, blob, { contentType: blob.type || `image/${fileExt}`, upsert: false });

                if (uploadError) throw new Error(`Upload failed for ${fileName}: ${uploadError.message}`);
                uploadedImagePaths.push(filePath);
            }
            Toast.show({ type: 'success', text1: 'Images uploaded!' });

            const profileData = {
                user_id: userId,
                first_name: values.firstName,
                last_name: values.lastName || null,
                date_of_birth: format(values.dob, 'yyyy-MM-dd'),
                gender: values.gender,
                bio: values.bio || null,
                interests: interests.length > 0 ? interests : null,
                location: values.location || null,
                looking_for: actualLookingFor, // Use modified lookingFor
                profile_pictures: uploadedImagePaths.length > 0 ? uploadedImagePaths : null,
                updated_at: new Date().toISOString(),
                is_profile_complete: true,
            };

            console.log("Attempting to save profile data to individual_profiles:", profileData);
            Toast.show({ type: 'info', text1: 'Saving profile...' });

            const { error: upsertError } = await supabase
                .from('individual_profiles')
                .upsert(profileData, { onConflict: 'user_id' });

            if (upsertError) {
                console.error("Upsert error details:", upsertError);
                throw upsertError;
            }

            Toast.show({ type: 'success', text1: 'Profile Created!', text2: 'Your profile is set up.' });
            reset({ // Reset form with placeholder values
                firstName: '',
                lastName: '',
                dob: undefined,
                gender: SELECT_GENDER_PLACEHOLDER,
                bio: '',
                location: '',
                lookingFor: SELECT_LOOKINGFOR_PLACEHOLDER,
            });
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
            Toast.show({
                type: 'error',
                text1: 'Error Creating Profile',
                text2: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
            console.log("[CreateProfile onSubmit] Submission process finished (finally block).");
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6347" />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </SafeAreaView>
        );
    }
    if (!userId && !loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.errorText}>User session not found.</Text>
                <Text style={styles.errorText}>Please restart the app or log in again.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.header}>Create Your Profile</Text>
                <Text style={styles.subHeader}>Let's get you set up!</Text>

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Info</Text>
                    {/* First Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>First Name *</Text>
                        <Controller
                            control={control}
                            name="firstName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.firstName && styles.inputError]}
                                    placeholder="Enter your first name"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                    </View>

                    {/* Last Name (Optional) */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <Controller
                            control={control}
                            name="lastName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your last name (optional)"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                />
                            )}
                        />
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Date of Birth *</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                            <View style={[styles.input, styles.datePickerInput, errors.dob && styles.inputError]} pointerEvents="none">
                                <Text style={[styles.datePickerText, !dobValue && styles.pickerPlaceholder]}>
                                    {dobValue ? format(dobValue, 'MM/dd/yyyy') : 'MM/DD/YYYY'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={dobValue || new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                            />
                        )}
                        {Platform.OS === 'ios' && showDatePicker && (
                            <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDoneButton}>
                                <Text style={styles.datePickerDoneButtonText}>Done</Text>
                            </Pressable>
                        )}
                        {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
                    </View>

                    {/* Gender */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Gender *</Text>
                        <Controller
                            control={control}
                            name="gender"
                            render={({ field: { onChange, value } }) => (
                                <View style={[styles.pickerContainer, errors.gender && styles.inputError]}>
                                    <Picker
                                        selectedValue={value}
                                        onValueChange={(itemValue) => onChange(itemValue)}
                                        style={styles.picker}
                                        prompt="Select your gender"
                                    >
                                        <Picker.Item label="Select Gender..." value={SELECT_GENDER_PLACEHOLDER} style={styles.pickerPlaceholderItem} />
                                        <Picker.Item label="Man" value="Man" />
                                        <Picker.Item label="Woman" value="Woman" />
                                        <Picker.Item label="Non-binary" value="Non-binary" />
                                        <Picker.Item label="Other" value="Other" />
                                        <Picker.Item label="Prefer not to say" value="Prefer not to say" />
                                    </Picker>
                                </View>
                            )}
                        />
                        {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
                    </View>
                </View>

                {/* About You Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About You</Text>
                    {/* Bio */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <Controller
                            control={control}
                            name="bio"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, styles.textArea, errors.bio && styles.inputError]}
                                    placeholder="Tell us a little about yourself (optional)"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    multiline
                                    numberOfLines={4}
                                />
                            )}
                        />
                        {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
                    </View>

                    {/* Interests */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Interests (up to 10)</Text>
                        <View style={styles.interestInputContainer}>
                            <TextInput
                                style={styles.interestInput}
                                placeholder="Add an interest (e.g., hiking, coding)"
                                value={interestInput}
                                onChangeText={setInterestInput}
                                onSubmitEditing={addInterest}
                            />
                            <Pressable
                                onPress={addInterest}
                                style={[styles.addButton, (!interestInput.trim() || interests.length >= 10) && styles.disabledButton]}
                                disabled={!interestInput.trim() || interests.length >= 10}
                            >
                                <Text style={styles.addButtonText}>Add</Text>
                            </Pressable>
                        </View>
                        <View style={styles.badgeContainer}>
                            {interests.map((interest) => (
                                <View key={interest} style={styles.badge}>
                                    <Text style={styles.badgeText}>{interest}</Text>
                                    <Pressable onPress={() => removeInterest(interest)} style={styles.removeBadgeButton}>
                                        <Text style={styles.removeBadgeText}>✕</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Location</Text>
                        <Controller
                            control={control}
                            name="location"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your city or neighborhood (optional)"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                />
                            )}
                        />
                    </View>

                    {/* Looking For */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Looking For</Text>
                        <Controller
                            control={control}
                            name="lookingFor"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={value}
                                        onValueChange={(itemValue) => onChange(itemValue)}
                                        style={styles.picker}
                                        prompt="What are you looking for?"
                                    >
                                        <Picker.Item label="Select an option..." value={SELECT_LOOKINGFOR_PLACEHOLDER} style={styles.pickerPlaceholderItem} />
                                        <Picker.Item label="Relationship" value="Relationship" />
                                        <Picker.Item label="Something Casual" value="Something Casual" />
                                        <Picker.Item label="Friendship" value="Friendship" />
                                        <Picker.Item label="Don't know yet" value="Don't know yet" />
                                    </Picker>
                                </View>
                            )}
                        />
                         {/* You might want to add error display for lookingFor if schema enforces it beyond optional */}
                         {errors.lookingFor && <Text style={styles.errorText}>{errors.lookingFor.message}</Text>}
                    </View>
                </View>

                {/* Profile Pictures Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile Pictures *</Text>
                    <Text style={styles.label}>Upload up to 6 photos. The first photo will be your main profile picture.</Text>

                    <View style={styles.imagePreviewContainer}>
                        {profileImages.map((image) => (
                            <View key={image.uri} style={styles.imagePreviewWrapper}>
                                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                <Pressable onPress={() => removeImage(image.uri)} style={styles.removeImageButton}>
                                    <Text style={styles.removeImageText}>✕</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>

                    {profileImages.length < 6 && (
                        <Pressable onPress={pickImage} style={styles.uploadButton}>
                            <Text style={styles.uploadButtonText}>Add Photos</Text>
                        </Pressable>
                    )}
                    {/* Consider if errors.root is still relevant or if specific image field errors are needed */}
                    {profileImages.length === 0 && errors.root?.message && ( // This specific error might be for a general form error if you set it.
                        <Text style={styles.errorText}>{errors.root.message}</Text>
                    )}
                </View>

                {/* Submit Button */}
                <Pressable
                    style={[styles.submitButton, (isSubmitting || profileImages.length === 0) && styles.disabledButton]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting || profileImages.length === 0}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" style={styles.activityIndicator} />
                    ) : null}
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Saving Profile...' : 'Create Profile'}
                    </Text>
                </Pressable>
            </ScrollView>
            <Toast />
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
    scrollView: { flex: 1 },
    container: { padding: 20, paddingBottom: 60 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
    header: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#333' },
    subHeader: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 30 },
    section: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#FF6347' },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#495057' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, fontSize: 16, color: '#333', minHeight: 48, justifyContent: 'center' },
    inputError: { borderColor: '#dc3545' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    pickerContainer: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', minHeight: 48 },
    picker: { width: '100%', color: '#333', height: Platform.OS === 'ios' ? undefined : 48 },
    pickerPlaceholder: { color: '#999' },
    pickerPlaceholderItem: { color: '#999', fontSize: 16 }, // Style for the placeholder item label
    errorText: { color: '#dc3545', fontSize: 13, marginTop: 6 },
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
    datePickerInput: {
        justifyContent: 'center',
    },
    datePickerText: {
        fontSize: 16,
        color: '#333',
    },
    datePickerDoneButton: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 8,
        backgroundColor: '#007AFF',
        borderRadius: 5,
    },
    datePickerDoneButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default CreateProfile;