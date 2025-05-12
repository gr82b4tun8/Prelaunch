// src/pages/EditProfileScreen.tsx
// CONVERTED for React Native / Expo Go
// Includes ArrayBuffer fix for image upload
// Corrected Supabase table name for update operation
// Added MAX_PROFILE_PHOTOS constant

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image,
    ActivityIndicator, Alert, SafeAreaView, Platform // Platform check often needed
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
// Assuming you have a type definition for your stack navigator
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabaseClient'; // Adjust path

// ***** MODIFICATION START *****
// import { useAuth } from '../contexts/AuthContext'; // <<<< REMOVE THIS
import { useApp } from '../contexts/AppContext'; // <<<< ADD THIS (Adjust path if necessary)
// ***** MODIFICATION END *****

import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed
import 'react-native-get-random-values'; // Ensure polyfill is imported (usually in App.tsx)
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons'; // Expo icons
import { format, parseISO, startOfToday, subYears } from 'date-fns';

// --- Constant for Max Photos ---
const MAX_PROFILE_PHOTOS = 6;

// --- Re-use Validation Schema ---
const profileSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().optional(),
    // Keep dob as Date object for picker compatibility
    dob: z.date({ required_error: "Date of birth is required." }).refine(
        (date) => date <= subYears(startOfToday(), 18), // Check if date is on or before 18 years ago
        { message: "Must be 18+" }
    ),
    gender: z.string().min(1, { message: "Please select a gender identity." }),
    bio: z.string().max(500, { message: "Bio must be 500 characters or less." }).optional(),
    location: z.string().optional(),
    lookingFor: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

// --- Profile type ---
interface Profile {
    id: string; created_at: string; updated_at: string; first_name: string;
    last_name?: string | null; date_of_birth: string; gender: string;
    bio?: string | null; interests?: string[] | null; location?: string | null;
    looking_for?: string | null; profile_pictures?: string[] | null;
    // Ensure all fields match your DB table exactly
    user_id: string; // Assuming you have user_id
    liked_profile_user_ids?: string[] | null;
    // dismissed_profile_user_ids?: string[] | null; // Removed based on previous step
    // Add any other fields like business ones if this can edit both types
}

// Define your Navigation Stack Param List if not done globally
// Ensure this matches the navigator where EditProfile resides.
// 'WelcomeScreen' should be a valid target from your main App.tsx navigator.
type YourSpecificNavigatorParamList = {
    ProfileTab: undefined; // Example name for the profile tab screen
    WelcomeScreen: undefined; // <<<< Ensure this is a valid target or use the correct one from App.tsx
    EditProfile: undefined; // Current screen
    // ... other screens in this specific navigator
};
type EditProfileScreenNavigationProp = NativeStackNavigationProp<YourSpecificNavigatorParamList, 'EditProfile'>;


const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation<EditProfileScreenNavigationProp>();

    // ***** MODIFICATION START *****
    // const { user, loading: authLoading } = useAuth(); // <<<< REMOVE THIS
    const { user, isLoadingSupabase, profile: contextProfile, fetchProfile } = useApp(); // <<<< ADD THIS
    // `isLoadingSupabase` from AppContext will be used instead of `authLoading`
    // `contextProfile` can be used to potentially pre-fill or verify data if needed,
    // though your existing fetch logic in this screen might be sufficient.
    // `WorkspaceProfile` from AppContext can be used to refresh the global profile state after an update.
    // ***** MODIFICATION END *****

    const [initialLoading, setInitialLoading] = useState(true); // This is for this screen's own data fetching
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- State ---
    const [currentProfilePictures, setCurrentProfilePictures] = useState<string[]>([]); // URLs from DB
    const [newImageAssets, setNewImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // --- React Hook Form Setup ---
    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '', lastName: '', dob: undefined, gender: '', bio: '', location: '', lookingFor: '',
        },
    });
    const { handleSubmit, control, formState: { errors }, reset, watch } = form;
    const watchedDob = watch('dob');

    // --- Fetch Existing Profile Data ---
    useEffect(() => {
        // ***** MODIFICATION START *****
        // Use `isLoadingSupabase` from `useApp()`
        if (!isLoadingSupabase && user) {
        // ***** MODIFICATION END *****
            const fetchProfileData = async () => {
                setInitialLoading(true);
                console.log("[EditProfile] Fetching profile data for user:", user.id); // Log with user ID
                try {
                    const { data, error, status } = await supabase
                        .from('individual_profiles')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    console.log("[EditProfile] Profile fetch response:", { status, error, hasData: !!data });

                    if (error && status !== 406) {
                        console.error("[EditProfile] Supabase error fetching profile:", error);
                        throw error;
                    }
                    if (data) {
                        reset({
                            firstName: data.first_name || '', lastName: data.last_name || '',
                            dob: data.date_of_birth ? parseISO(data.date_of_birth) : undefined,
                            gender: data.gender || '', bio: data.bio || '',
                            location: data.location || '', lookingFor: data.looking_for || '',
                        });
                        setInterests(data.interests || []);
                        setCurrentProfilePictures(data.profile_pictures || []);
                        console.log("[EditProfile] Profile data loaded into form.");
                    } else {
                        console.warn("[EditProfile] No profile data found for user.");
                        Toast.show({ type: 'info', text1: 'Profile not found', text2: 'You might need to create it first.' });
                        // Optional: Consider if a new profile should be created here or navigate to CreateProfile
                        // For now, we assume an existing profile should be editable.
                        // If navigation.canGoBack(), it will just stay, allowing form fill for a new profile
                        // if this screen is also for creation. If not, goBack makes sense.
                         if (navigation.canGoBack()) {
                             navigation.goBack();
                         }
                    }
                } catch (error: any) {
                    console.error("[EditProfile] Failed to fetch profile data:", error);
                    Toast.show({ type: 'error', text1: 'Failed to load data', text2: error.message });
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    }
                } finally {
                    setInitialLoading(false);
                    console.log("[EditProfile] Finished initial loading sequence.");
                }
            };
            fetchProfileData();
        // ***** MODIFICATION START *****
        // Use `isLoadingSupabase` from `useApp()`
        } else if (!isLoadingSupabase && !user) {
        // ***** MODIFICATION END *****
            console.log("[EditProfile] No user session (from AppContext), navigating to WelcomeScreen.");
            navigation.navigate('WelcomeScreen'); // Or replace with 'AuthPage' if direct login is preferred
        }
    // ***** MODIFICATION START *****
    // Update dependencies for useEffect
    }, [user, isLoadingSupabase, reset, navigation]);
    // ***** MODIFICATION END *****

    // --- Image Handling --- (Keep as is)
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Sorry, we need camera roll permissions!');
            return;
        }

        const currentTotal = currentProfilePictures.length + newImageAssets.length;
        if (currentTotal >= MAX_PROFILE_PHOTOS) {
            Toast.show({ type: 'info', text1: 'Limit Reached', text2: `Max ${MAX_PROFILE_PHOTOS} photos allowed.` });
            return;
        }

        try {
            const selectionLimit = MAX_PROFILE_PHOTOS - currentTotal;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: selectionLimit > 0 ? selectionLimit : 1,
            });

            if (!result.canceled && result.assets) {
                const combined = [...newImageAssets, ...result.assets];
                const limitedNewAssets = combined.slice(0, MAX_PROFILE_PHOTOS - currentProfilePictures.length);
                if (combined.length > limitedNewAssets.length) {
                    Toast.show({ type: 'info', text1: 'Limit Exceeded', text2: `Selected images exceed the limit of ${MAX_PROFILE_PHOTOS}.` });
                }
                setNewImageAssets(limitedNewAssets);
            }
        } catch (pickerError) {
            console.error("[EditProfile] Error launching image picker:", pickerError);
            Toast.show({ type: 'error', text1: 'Image Picker Error', text2: 'Could not open image library.'});
        }
    };

    const removeImage = (uriToRemove: string) => {
        const existingIndex = currentProfilePictures.indexOf(uriToRemove);
        if (existingIndex > -1) {
            setCurrentProfilePictures(prev => prev.filter(url => url !== uriToRemove));
        } else {
            setNewImageAssets(prev => prev.filter(asset => asset.uri !== uriToRemove));
        }
    };

    const allImageUris = [
        ...currentProfilePictures,
        ...newImageAssets.map(asset => asset.uri)
    ];

    // --- Interest Handling --- (Keep as is)
    const addInterest = useCallback(() => {
        const trimmedInterest = interestInput.trim();
        if (trimmedInterest && interests.length < 10 && !interests.includes(trimmedInterest)) {
            setInterests(prev => [...prev, trimmedInterest]);
            setInterestInput('');
        } else if (interests.includes(trimmedInterest)) {
            Toast.show({ type: 'info', text1: 'Interest already added.' });
        } else if (interests.length >= 10) {
            Toast.show({ type: 'info', text1: 'Maximum 10 interests allowed.' });
        }
    }, [interestInput, interests]);

    const removeInterest = useCallback((interestToRemove: string) => {
        setInterests(prev => prev.filter(interest => interest !== interestToRemove));
    }, []);

    // --- Date Picker --- (Keep as is)
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleDateConfirm = useCallback((date: Date, onChange: (date: Date) => void) => {
        if (date > subYears(startOfToday(), 18)) {
            date = subYears(startOfToday(), 18);
            Toast.show({type: 'info', text1: 'Age Requirement', text2: 'Setting to earliest valid date (18+).'})
        }
        onChange(date);
        hideDatePicker();
    }, []);


    // --- Form Submission Logic (UPDATE) ---
    const onSubmit = async (values: ProfileFormData) => {
        if (!user) { // user from useApp()
            Toast.show({ type: 'error', text1: 'User session not found.' }); return;
        }
        if (allImageUris.length === 0) {
            Toast.show({ type: 'error', text1: 'Missing Photos', text2: 'Please add at least one photo.'}); return;
        }

        setIsSubmitting(true);
        const uploadedNewImageUrls: string[] = [];
        console.log("[EditProfile] Starting onSubmit...");

        try {
            // --- 1. Upload NEW Images ---
            if (newImageAssets.length > 0) {
                Toast.show({ type: 'info', text1: "Uploading new images..." });
                for (const asset of newImageAssets) {
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
                    const filePath = `${user.id}/${fileName}`;

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('profile_pictures')
                        .upload(filePath, arrayBuffer, { contentType, upsert: false });

                    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
                    
                    const { data: urlData } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
                    if (!urlData?.publicUrl) {
                        Toast.show({ type: 'warning', text1: 'URL Issue', text2: 'Could not get public URL for an image.'});
                    } else {
                        uploadedNewImageUrls.push(urlData.publicUrl);
                    }
                }
                 if (uploadedNewImageUrls.length === newImageAssets.length) {
                   Toast.show({ type: 'success', text1: "New images uploaded!" });
                } else if (uploadedNewImageUrls.length > 0) {
                    Toast.show({ type: 'warning', text1: "Some images uploaded", text2: "Not all new images could be processed." });
                } else if (newImageAssets.length > 0 && uploadedNewImageUrls.length === 0) {
                    Toast.show({ type: 'error', text1: "Image Upload Failed", text2: "None of the new images could be uploaded." });
                }
            }

            // --- 2. Prepare Final Data ---
            const finalImageUrls = [...currentProfilePictures, ...uploadedNewImageUrls];
            const profileUpdateData = {
                first_name: values.firstName,
                last_name: values.lastName || null,
                date_of_birth: format(values.dob, 'yyyy-MM-dd'),
                gender: values.gender,
                bio: values.bio || null,
                interests: interests,
                location: values.location || null,
                looking_for: values.lookingFor || null,
                profile_pictures: finalImageUrls.length > 0 ? finalImageUrls : null,
                updated_at: new Date().toISOString(),
                // Check if profile was incomplete and is now complete
                is_profile_complete: true // Assuming editing implies completion or re-completion
            };

            // --- 3. Update Profile Data in Supabase ---
            Toast.show({ type: 'info', text1: "Saving changes..." });
            const { error: updateError } = await supabase
                .from('individual_profiles')
                .update(profileUpdateData)
                .eq('user_id', user.id)
                .select() // Add select to get the updated data back if needed
                .single(); // Assuming one profile per user

            if (updateError) throw updateError;

            // --- 4. Success ---
            Toast.show({ type: 'success', text1: 'Profile Updated!', text2: 'Your changes saved.' });
            setNewImageAssets([]);
            setCurrentProfilePictures(finalImageUrls.length > 0 ? finalImageUrls : []);

            // ***** MODIFICATION START *****
            // Refresh the global profile state in AppContext
            await fetchProfile(user.id);
            // ***** MODIFICATION END *****

            if (navigation.canGoBack()) {
                navigation.goBack();
            }

        } catch (error: any) {
            console.error('[EditProfile] Update Profile Error:', error);
            Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---
    // ***** MODIFICATION START *****
    // Use `isLoadingSupabase` from `useApp()` for the initial auth check
    // `initialLoading` is for this screen's specific data fetch.
    if (isLoadingSupabase || initialLoading) {
    // ***** MODIFICATION END *****
        return (<SafeAreaView style={styles.centered}><ActivityIndicator size="large" color="#FF6347" /></SafeAreaView>);
    }

    // If, after auth check, there's still no user, this would have been handled by the useEffect redirect.
    // However, as a fallback or if the redirect logic changes:
    if (!user) {
         return (
            <SafeAreaView style={styles.centered}>
                <Text>User not found. Please try logging in again.</Text>
                <Pressable onPress={() => navigation.navigate('WelcomeScreen')} style={styles.button}>
                    <Text style={styles.buttonText}>Go to Welcome</Text>
                </Pressable>
            </SafeAreaView>
        );
    }


    // Render Form using ScrollView
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.headerTitle}>Edit Your Profile</Text>

                {/* Basic Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name*</Text>
                        <Controller name="firstName" control={control} render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="Enter first name" editable={!isSubmitting} />
                        )} />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <Controller name="lastName" control={control} render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="Enter last name" editable={!isSubmitting} />
                        )} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth*</Text>
                        <Controller name="dob" control={control} render={({ field: { onChange, value } }) => (
                            <>
                                <Pressable onPress={showDatePicker} style={styles.dateButton} disabled={isSubmitting}>
                                    <Ionicons name="calendar-outline" size={20} color="#555" style={styles.dateIcon} />
                                    <Text style={[styles.dateText, !value && styles.placeholderText]}>
                                        {value ? format(value, 'PPP') : 'Select Date'}
                                    </Text>
                                </Pressable>
                                <DateTimePickerModal
                                    isVisible={isDatePickerVisible}
                                    mode="date"
                                    date={value || subYears(startOfToday(), 18)}
                                    maximumDate={subYears(startOfToday(), 18)}
                                    onConfirm={(date) => handleDateConfirm(date, onChange)}
                                    onCancel={hideDatePicker}
                                />
                            </>
                        )} />
                        {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender*</Text>
                        <Controller name="gender" control={control} render={({ field: { onChange, value } }) => (
                            <View style={styles.pickerPlaceholder}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Select Gender (e.g., Male, Female, Other)"
                                    value={value}
                                    onChangeText={onChange}
                                    editable={!isSubmitting}
                                />
                            </View>
                        )} />
                        {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About You</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <Controller name="bio" control={control} render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={[styles.input, styles.textArea]} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="Tell us about yourself..." maxLength={500} multiline numberOfLines={4} editable={!isSubmitting} />
                        )} />
                        {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
                    </View>
                    <View style={styles.inputGroup}>
                         <Text style={styles.label}>Interests (up to 10)</Text>
                         <View style={styles.interestInputContainer}>
                             <TextInput style={[styles.input, styles.interestInput]} value={interestInput} onChangeText={setInterestInput} placeholder="Type interest and add" onSubmitEditing={addInterest} editable={!isSubmitting} />
                             <Pressable style={[styles.button, styles.addButton]} onPress={addInterest} disabled={!interestInput.trim() || interests.length >= 10 || isSubmitting}>
                                 <Text style={styles.buttonText}>Add</Text>
                             </Pressable>
                         </View>
                         <View style={styles.badgeContainer}>
                             {interests.map(interest => (
                                 <View key={interest} style={styles.badge}>
                                     <Text style={styles.badgeText}>{interest}</Text>
                                     <Pressable onPress={() => removeInterest(interest)} style={styles.removeBadgeButton} disabled={isSubmitting}>
                                         <Ionicons name="close-circle" size={18} color="#fff" />
                                     </Pressable>
                                 </View>
                             ))}
                         </View>
                    </View>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <Controller name="location" control={control} render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="e.g., Miami, FL" editable={!isSubmitting} />
                        )} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Looking For</Text>
                        <Controller name="lookingFor" control={control} render={({ field: { onChange, value } }) => (
                             <View style={styles.pickerPlaceholder}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Friends, Relationship (Use Picker)"
                                    value={value}
                                    onChangeText={onChange}
                                    editable={!isSubmitting}
                                />
                             </View>
                        )} />
                    </View>
                </View>

                {/* Photos Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile Pictures*</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Add or remove photos (up to {MAX_PROFILE_PHOTOS} total)</Text>
                        <Pressable
                            style={[styles.button, styles.outlineButton]}
                            onPress={pickImage}
                            disabled={isSubmitting || allImageUris.length >= MAX_PROFILE_PHOTOS}
                        >
                            <Ionicons name="images-outline" size={18} color="#FF6347" style={{ marginRight: 8 }}/>
                            <Text style={styles.outlineButtonText}>Select New Images</Text>
                        </Pressable>
                        {allImageUris.length === 0 && form.formState.isSubmitted /* Show only if trying to submit without photos */ && <Text style={styles.errorText}>Please add at least one photo.</Text>}
                    </View>
                    <View style={styles.imageGrid}>
                        {allImageUris.map((uri) => (
                            <View key={uri} style={styles.imageContainer}>
                                <Image source={{ uri: uri }} style={styles.imagePreview} />
                                <Pressable
                                    style={styles.removeImageButton}
                                    onPress={() => removeImage(uri)}
                                    disabled={isSubmitting}
                                >
                                    <Ionicons name="close-circle" size={28} color="#fff" style={styles.removeImageIcon} />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Submit Button */}
                <View style={styles.buttonContainer}>
                    <Pressable style={[styles.button, styles.outlineButton, styles.cancelButton]} onPress={() => navigation.goBack()} disabled={isSubmitting}>
                        <Text style={[styles.outlineButtonText, { color: '#555'}]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.button, styles.submitButton, (isSubmitting || allImageUris.length === 0) ? styles.buttonDisabled : {} ]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting || allImageUris.length === 0}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }}/> : null}
                        <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                    </Pressable>
                </View>

            </ScrollView>
            <Toast />
        </SafeAreaView>
    );
};

// --- Styles --- (Keep existing styles)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
    scrollView: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#333', textAlign: 'center' },
    section: { marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 1.00, elevation: 1, },
    sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#444', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 16, backgroundColor: '#fff' },
    textArea: { height: 100, textAlignVertical: 'top' },
    errorText: { fontSize: 12, color: 'red', marginTop: 4 },
    placeholderText: { color: '#999' },
    dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fff' },
    dateIcon: { marginRight: 8 },
    dateText: { fontSize: 16, color: '#333'},
    pickerPlaceholder: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, /*paddingHorizontal: 12,*/ backgroundColor: '#fff', minHeight: 44, justifyContent: 'center' }, // input inside already has padding
    interestInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    interestInput: { flex: 1 },
    addButton: { paddingHorizontal: 16, height: 44, justifyContent: 'center', backgroundColor: '#FF6347', borderRadius: 6 },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6347', borderRadius: 15, paddingVertical: 5, paddingLeft: 10, paddingRight: 4, },
    badgeText: { color: '#fff', fontSize: 14, marginRight: 4 },
    removeBadgeButton: { padding: 2 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 10 },
    imageContainer: {
        width: '30%', 
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        position: 'relative',
       },
    imagePreview: { width: '100%', height: '100%' },
    removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    removeImageIcon: { /* Icon styles if needed */ },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', gap: 16 },
    button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100, flex: 1 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    submitButton: { backgroundColor: '#FF6347', },
    outlineButton: { borderWidth: 1, borderColor: '#FF6347', backgroundColor: '#fff', },
    outlineButtonText: { color: '#FF6347', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    cancelButton: { borderColor: '#aaa', },
    buttonDisabled: { backgroundColor: '#cccccc', borderColor: '#cccccc', opacity: 0.7 },
});

export default EditProfileScreen;