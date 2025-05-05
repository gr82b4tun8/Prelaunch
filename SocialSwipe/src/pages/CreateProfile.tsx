// src/pages/CreateProfile.tsx (MODIFIED for Pre-Launch)

import React, { useState, useEffect, useCallback } from 'react';
import {
    // Keep other necessary imports
    SafeAreaView, View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Image, Platform, Alert, StyleSheet // Added StyleSheet here
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
import { format } from 'date-fns';

import { RootStackParamList } from '../../App'; // Adjust path as needed
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- REMOVED useAuth import ---

// --- Schema and Types (Assuming definition exists elsewhere) ---
// Example Placeholder - Replace with your actual schema
const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    dob: z.date({ required_error: "Date of birth is required" }),
    gender: z.string().min(1, "Gender is required"),
    bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
    location: z.string().optional(),
    lookingFor: z.string().optional(),
    // interests and profile_pictures are handled separately
});
type ProfileFormData = z.infer<typeof profileSchema>;
type CreateProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateProfile'>;


const CreateProfile: React.FC = () => {
    const navigation = useNavigation<CreateProfileNavigationProp>(); // Keep hook instance
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [profileImages, setProfileImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    // Assuming defaultValues are needed for controlled components like Picker
    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: { // Example default values
            firstName: '',
            lastName: '',
            dob: undefined, // Zod handles date validation
            gender: '',
            bio: '',
            location: '',
            lookingFor: '',
        }
    });
    const { handleSubmit, control, formState: { errors }, reset } = form;

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

            // Check if profile exists AND is marked complete
            if (data?.user_id && data?.is_profile_complete) {
                console.warn('[checkExistingProfile] Complete individual profile found. App.tsx should handle navigation.');
                // Commenting out redirect - let App.tsx handle it based on state
                /*
                Toast.show({ type: 'info', text1: 'Profile already exists', text2: 'Redirecting...' });
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main', params: { screen: 'ProfileTab' } }],
                });
                */
                return true; // Indicate complete profile was found
            }

            console.log("[checkExistingProfile] No complete individual profile data found.");
            return false; // Indicate complete profile was not found
        } catch (err: any) {
            console.error('[checkExistingProfile] CATCH block:', err);
            Toast.show({ type: 'error', text1: 'Error checking profile', text2: err.message });
            return false; // Treat errors as profile not found for safety
        }
    // }, [navigation]); // Remove navigation if the redirect inside is permanently commented out
     }, []); // Dependency array is empty if navigation redirect is removed

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
                    // Check if a *complete* profile exists
                    const profileFound = await checkExistingProfile(user.id);

                    // Only stop loading if the component should actually be rendered (no complete profile)
                    if (isMounted && !profileFound) {
                        console.log("[CreateProfile useEffect] Complete profile not found, setting loading=false");
                        setLoading(false);
                    } else if (isMounted && profileFound) {
                        console.log("[CreateProfile useEffect] Complete profile found, App.tsx should prevent rendering this screen.");
                        // Keep loading=true or let App.tsx handle the view switch.
                        // setLoading(false); // Or maybe set false here too, but App.tsx should redirect quickly.
                    }
                } else {
                    if (!isMounted) return;
                    console.warn("[CreateProfile useEffect] No user found.");
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No active session. Please log in.' });
                    setLoading(false);
                    // Consider navigation to login screen if App.tsx doesn't handle this redirection
                    // navigation.replace('Auth');
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


    // --- Image Picker Logic ---
    const pickImage = async () => {
        // Check permissions
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
                allowsEditing: true, // Or false, depending on preference
                aspect: [4, 3], // Optional aspect ratio
                quality: 0.8, // Compress image slightly
                allowsMultipleSelection: true, // Allow selecting multiple
                selectionLimit: 6 - profileImages.length, // Limit based on current count (e.g., max 6 total)
            });

            if (!result.canceled && result.assets) {
                // Filter out any potential duplicates based on URI before adding
                 const newImages = result.assets.filter(newAsset =>
                     !profileImages.some(existingAsset => existingAsset.uri === newAsset.uri)
                 );
                 // Limit total images (e.g., to 6)
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

    // --- Interest Handling ---
    const addInterest = () => {
        const trimmedInput = interestInput.trim();
        if (trimmedInput && !interests.includes(trimmedInput) && interests.length < 10) { // Example limit
             setInterests([...interests, trimmedInput]);
            setInterestInput(''); // Clear input
        } else if (interests.includes(trimmedInput)) {
             Toast.show({ type: 'info', text1: 'Interest already added' });
        } else if (interests.length >= 10) {
             Toast.show({ type: 'info', text1: 'Maximum interests reached' });
        }
    };

    const removeInterest = (interestToRemove: string) => {
        setInterests(currentInterests => currentInterests.filter(interest => interest !== interestToRemove));
    };


    // --- Form Submission (MODIFIED to add flag and remove navigation) ---
    const onSubmit = async (values: ProfileFormData) => {
        if (!userId) {
             Toast.show({ type: 'error', text1: 'User Error', text2: 'User ID not found. Cannot submit.' });
             return;
         }
        if (profileImages.length === 0) {
             Toast.show({ type: 'error', text1: 'Image Required', text2: 'Please upload at least one profile picture.' });
             return;
         }

        setIsSubmitting(true);
        let uploadedImagePaths: string[] = [];

        try {
            // --- Image Upload Logic ---
            Toast.show({ type: 'info', text1: 'Uploading images...' });
            for (const imageAsset of profileImages) {
                const uri = imageAsset.uri;
                // Check if it's already a Supabase path (simple check, might need refinement)
                if (uri.includes('supabase.co/storage')) {
                    // Assume it's already uploaded if it has a storage path structure
                    // Extract the path relative to the bucket
                    const urlParts = uri.split('/profile_pictures/'); // Split by bucket name
                    if (urlParts.length > 1) {
                        uploadedImagePaths.push(urlParts[1]); // Add the path after the bucket name
                        continue; // Skip upload for this one
                     }
                     // If it doesn't match expected structure, maybe re-upload or handle error
                 }

                 // If not a known storage path, proceed with upload
                const response = await fetch(uri);
                const blob = await response.blob();
                // Use mime type if available, otherwise determine from extension
                 const fileExt = imageAsset.mimeType?.split('/')[1] || uri.split('.').pop() || 'jpg';
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${userId}/${fileName}`; // User-specific folder

                const { error: uploadError } = await supabase.storage
                    .from('profile_pictures') // Bucket name
                    .upload(filePath, blob, { contentType: blob.type || `image/${fileExt}`, upsert: false }); // Provide content type

                if (uploadError) throw new Error(`Upload failed for ${fileName}: ${uploadError.message}`);
                uploadedImagePaths.push(filePath); // Store relative path
            }
            Toast.show({ type: 'success', text1: 'Images uploaded!' });

            // Prepare data for 'individual_profiles' table
            const profileData = {
                user_id: userId,
                first_name: values.firstName,
                last_name: values.lastName || null,
                date_of_birth: format(values.dob, 'yyyy-MM-dd'), // Ensure DOB is a valid Date object
                gender: values.gender,
                bio: values.bio || null,
                interests: interests.length > 0 ? interests : null,
                location: values.location || null,
                looking_for: values.lookingFor || null,
                 // Make sure uploadedImagePaths contains relative paths, not full URLs
                profile_pictures: uploadedImagePaths.length > 0 ? uploadedImagePaths : null,
                updated_at: new Date().toISOString(),
                // *** === ADDED THIS LINE === ***
                is_profile_complete: true, // Mark profile as complete
            };

            console.log("Attempting to save profile data to individual_profiles:", profileData);
            Toast.show({ type: 'info', text1: 'Saving profile...' });

            // Upsert into 'individual_profiles' table
            const { error: upsertError } = await supabase
                .from('individual_profiles')
                .upsert(profileData, { onConflict: 'user_id' });

            if (upsertError) {
                console.error("Upsert error details:", upsertError);
                throw upsertError;
            }

            // --- Profile saved successfully ---
            Toast.show({ type: 'success', text1: 'Profile Created!', text2: 'Your profile is set up.' }); // Modified text
            reset();
            setInterests([]);
            setProfileImages([]);
            setInterestInput(''); // Clear interest input as well

            // --- REMOVED NAVIGATION CALL ---
            console.log("[CreateProfile onSubmit] Profile saved. App.tsx should detect is_profile_complete=true and handle redirection.");
            // Optional: Explicitly trigger a profile refresh in a global state/context if needed immediately by App.tsx
            // E.g., authContext.refreshUserProfile();

        } catch (error: any) {
             console.error('Create Profile Error:', error);
             // Try to get Zod error details first
             let errorMessage = 'An unexpected error occurred.';
             if (error instanceof z.ZodError) {
                 // Combine messages from all Zod errors
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

    // --- Render Logic ---
    if (loading) {
         // Simple loading indicator, replace with your component if you have one
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6347" />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </SafeAreaView>
        );
     }
    if (!userId && !loading) { // Only show if not loading and user ID is still null
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.errorText}>User session not found.</Text>
                <Text style={styles.errorText}>Please restart the app or log in again.</Text>
                {/* Optionally add a button to navigate to login */}
            </SafeAreaView>
        );
    }

    // --- Main Form Render ---
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
                        {/* No error display for optional field unless specific rules added */}
                    </View>

                    {/* Date of Birth */}
                    {/* Requires a Date Picker component implementation */}
                    {/* Example placeholder - Use a dedicated Date Picker library */}
                    <View style={styles.fieldGroup}>
                         <Text style={styles.label}>Date of Birth *</Text>
                         <Controller
                             control={control}
                             name="dob"
                             render={({ field: { onChange, value } }) => (
                                // Replace this Text with your actual Date Picker component
                                // It should call onChange(dateObject) when a date is selected
                                <Pressable onPress={() => Alert.alert("TODO", "Implement Date Picker")}>
                                     <Text style={[styles.input, !value && styles.pickerPlaceholder, errors.dob && styles.inputError]}>
                                         {value ? format(value, 'MM/dd/yyyy') : 'Select Date of Birth'}
                                     </Text>
                                 </Pressable>
                            )}
                         />
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
                                        <Picker.Item label="Select Gender..." value="" style={styles.pickerPlaceholder} enabled={!value} />
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
                                onSubmitEditing={addInterest} // Add interest on keyboard submit
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
                                         <Picker.Item label="Select an option..." value="" style={styles.pickerPlaceholder} enabled={!value} />
                                         <Picker.Item label="Relationship" value="Relationship" />
                                         <Picker.Item label="Something Casual" value="Something Casual" />
                                         <Picker.Item label="Friendship" value="Friendship" />
                                         <Picker.Item label="Don't know yet" value="Don't know yet" />
                                     </Picker>
                                 </View>
                             )}
                         />
                     </View>
                 </View>

                 {/* Profile Pictures Section */}
                 <View style={styles.section}>
                     <Text style={styles.sectionTitle}>Profile Pictures *</Text>
                     <Text style={styles.label}>Upload up to 6 photos. The first photo will be your main profile picture.</Text>

                     {/* Image Previews */}
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

                     {/* Upload Button */}
                     {profileImages.length < 6 && (
                         <Pressable onPress={pickImage} style={styles.uploadButton}>
                             {/* Optional: Add an Icon */}
                             <Text style={styles.uploadButtonText}>Add Photos</Text>
                         </Pressable>
                     )}
                      {profileImages.length === 0 && errors.root?.message && ( // Display root error if needed for images
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
            <Toast /> {/* Ensure Toast is rendered */}
        </SafeAreaView>
    );
};

// --- Styles ---
// *** CORRECTED: Removed duplicate StyleSheet.create blocks and trailing syntax error ***
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
    scrollView: { flex: 1 },
    container: { padding: 20, paddingBottom: 60 }, // Added more bottom padding
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
    header: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#333' },
    subHeader: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 30 },
    section: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#FF6347' }, // Tomato color example
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#495057' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, fontSize: 16, color: '#333', minHeight: 48 },
    inputError: { borderColor: '#dc3545' }, // Bootstrap danger color
    textArea: { minHeight: 100, textAlignVertical: 'top' }, // Important for multiline
    pickerContainer: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', minHeight: 48 }, // Ensure consistent height
    picker: { width: '100%', color: '#333', height: Platform.OS === 'ios' ? undefined : 48 }, // iOS height is intrinsic
    pickerPlaceholder: { color: '#999' }, // Style for placeholder item/text
    errorText: { color: '#dc3545', fontSize: 13, marginTop: 6 },
    interestInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 }, // Use gap for spacing
    interestInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, fontSize: 16, minHeight: 48 },
    addButton: { backgroundColor: '#FF6347', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minHeight: 48 },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    disabledButton: { opacity: 0.5 },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9ecef', borderRadius: 15, paddingVertical: 6, paddingHorizontal: 12 },
    badgeText: { fontSize: 14, color: '#495057', marginRight: 6 },
    removeBadgeButton: { padding: 3, marginLeft: 'auto' }, // Let it align right
    removeBadgeText: { fontSize: 14, color: '#6c757d', fontWeight: 'bold', lineHeight: 14 }, // Ensure 'x' is vertically centered
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginTop: 10, marginBottom: 15, minHeight: 48 }, // Apple blue example
    uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15, marginBottom: 10 }, // Added bottom margin
    imagePreviewWrapper: { position: 'relative', width: 100, height: 100 }, // Fixed size for previews
    imagePreview: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    removeImageButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    removeImageText: { fontSize: 14, color: '#fff', fontWeight: 'bold', lineHeight: 14 }, // Fine-tune line height for centering 'x'
    submitButton: { flexDirection: 'row', backgroundColor: '#FF6347', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 30, minHeight: 50 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    activityIndicator: { marginRight: 10 }, // Space between indicator and text
});

export default CreateProfile;