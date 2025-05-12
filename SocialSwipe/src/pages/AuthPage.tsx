// src/pages/AuthPage.tsx (React Native Version)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable, // More customizable than Button
  ActivityIndicator,
  Alert, // For simple feedback
  KeyboardAvoidingView, // Helps prevent keyboard hiding inputs
  Platform, // For platform-specific behavior
  ScrollView // Allows scrolling if content overflows
} from 'react-native';
import { useForm, Controller } from 'react-hook-form'; // RHF works in RN
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native'; // RN Navigation hook
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Type for navigation prop
import { supabase } from '../lib/supabaseClient'; // Adjusted path for example

// Import LinearGradient
import { LinearGradient } from 'expo-linear-gradient';

// Import Param List type from App.tsx (or a dedicated types file)
// This provides type safety for navigation.navigate calls
import { AuthStackParamList } from '../../App'; // Adjust path relative to App.tsx

// Re-use the same Zod schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Define navigation prop type for this screen
type AuthScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login' // The name of this screen in the AuthStack
>;

const AuthPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<AuthScreenNavigationProp>(); // Typed navigation hook

  // --- React Hook Form Setup ---
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // --- Form Submission Handler ---
  const onSubmit = async (values: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error; // Let the catch block handle it
      }

      // Login successful!
      // Alert.alert("Login Successful!"); // Simple success feedback

    } catch (error: any) {
      console.error('Login error:', error.message);
      let title = "Login Failed";
      let description = "An unexpected error occurred.";
      if (error.message.includes("Invalid login credentials")) {
          description = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
          title = "Email Not Confirmed";
          description = "Please check your email and click the confirmation link.";
      }
      Alert.alert(title, description); // Use RN Alert for feedback
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <LinearGradient
        colors={['#fe9494', '#00008b']} // Screen background gradient
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <LinearGradient
            colors={['#fe9494', '#00008b']} // Card background gradient - same colors
            style={styles.card}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.description}>Log in to your account to continue.</Text>
            </View>

            {/* Content / Form */}
            <View style={styles.content}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.email ? styles.inputError : null]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="you@example.com"
                      placeholderTextColor="#aaa" // Adjusted placeholder text color
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  )}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.password ? styles.inputError : null]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="••••••••"
                      placeholderTextColor="#aaa" // Adjusted placeholder text color
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                    />
                  )}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
              </View>
            </View>

            {/* Footer / Actions */}
            <View style={styles.footer}>
              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.buttonPrimary,
                  loading && styles.buttonDisabled,
                  pressed && !loading && styles.buttonPrimaryPressed,
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Log In</Text>
                )}
              </Pressable>

              {/* Sign Up Link */}
              <Pressable
                style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
                onPress={() => navigation.navigate('SignUp')} // Assuming 'SignUp' is your CreateAccount route name
                disabled={loading}
              >
                <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  gradientBackground: { // Style for the outer LinearGradient (screen background)
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // backgroundColor: '#f8f9fa', // REMOVED to allow gradient to show through
  },
  card: {
    width: '100%',
    maxWidth: 400,
    // backgroundColor: '#ffffff', // REMOVED to allow gradient to show
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // overflow: 'hidden', // Add this if borderRadius is not clipping the gradient on some platforms
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent', // Ensure no conflicting background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF', // CHANGED for better contrast
  },
  description: {
    fontSize: 14,
    color: '#F0F0F0', // CHANGED for better contrast
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
    backgroundColor: 'transparent', // Ensure no conflicting background
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // CHANGED for better contrast
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da', // This border might be hard to see on the gradient
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent white for inputs
    color: '#FFFFFF', // Text color for input
  },
  inputError: {
    borderColor: '#FF9999', // Lighter red for error on dark background
  },
  errorText: {
    fontSize: 12,
    color: '#FFCCCC', // Lighter red for error text
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: 'transparent', // Ensure no conflicting background
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonPrimary: {
    backgroundColor: '#FF6347', // Main button color (same as CreateAccount)
  },
  buttonDisabled: {
    backgroundColor: '#FF6347', // Keep same color but use opacity
    opacity: 0.7,
  },
  buttonPrimaryPressed: { // Style for when the primary button is pressed
    opacity: 0.85, // Slight opacity change on press
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    padding: 8,
  },
  linkButtonPressed: { // Style for when the link button is pressed
    opacity: 0.7,
  },
  linkText: {
    fontSize: 14,
    color: '#ADD8E6', // Lighter blue/link color for contrast
    textDecorationLine: 'underline',
  }
});

export default AuthPage;