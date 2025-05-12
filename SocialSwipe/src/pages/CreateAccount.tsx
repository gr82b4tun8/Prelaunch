// CreateAccount.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabaseClient'; // Adjust path as needed

// Import useNavigation hook from React Navigation
import { useNavigation } from '@react-navigation/native';
// Optional: Import StackNavigationProp type for stronger typing if using Stack Navigator
// import { StackNavigationProp } from '@react-navigation/stack';

// Import LinearGradient
import { LinearGradient } from 'expo-linear-gradient';

// Optional: Define your Navigation Stack parameter list for type safety
// type RootStackParamList = {
//   CreateAccount: undefined; // No params expected for CreateAccount itself
//   AuthPage: undefined;      // No params expected for AuthPage
//   // ... other screens
// };

// Optional: Type the navigation prop
// type CreateAccountScreenNavigationProp = StackNavigationProp<
//   RootStackParamList,
//   'CreateAccount' // Current screen's name in the stack
// >;


export default function CreateAccount() {
  // Get the navigation object using the hook
  const navigation = useNavigation(); // Optional: Use typed hook: useNavigation<CreateAccountScreenNavigationProp>();

  const [email, setEmail] = useState('');
  // const [username, setUsername] = useState(''); // USERNAME STATE REMOVED
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    let isValid = true;
    // --- Validation logic ---
    if (!email) isValid = false;
    // if (!username || username.length < 3) isValid = false; // USERNAME VALIDATION REMOVED
    if (!password) isValid = false;

    if (!isValid) {
        Alert.alert('Error', 'Please fill in all fields correctly.');
        return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        // options: { // USERNAME OPTION REMOVED
        //   data: {
        //     username: username.trim(),
        //   },
        // },
      });

      if (error) {
        console.error('Sign up error:', error.message);
        Alert.alert('Sign Up Error', error.message);
      } else if (data.user) {
        // SUCCESS CONDITION
        if (data.session) {
            // User signed up and is logged in (e.g., email verification disabled)
            Alert.alert(
              'Success!',
              'Account created successfully. Redirecting to login...',
              [ // Add button in alert to acknowledge before navigating
                { text: "OK", onPress: () => navigation.navigate('AuthPage') } // Navigate on OK press
              ]
            );
        } else {
            // User signed up but needs verification (e.g., email verification enabled)
            Alert.alert(
              'Success!',
              'Account created. Please check your email for verification, then login. Redirecting to login...',
              [ // Add button in alert to acknowledge before navigating
                { text: "OK", onPress: () => navigation.navigate('AuthPage') } // Navigate on OK press
              ]
            );
        }
        // Clear fields after successful signup attempt
        setEmail('');
        // setUsername(''); // CLEARING USERNAME STATE REMOVED
        setPassword('');

      } else {
          Alert.alert('Sign Up Error', 'An unexpected issue occurred during sign up.');
      }
    } catch (e: any) {
      console.error('Sign up exception:', e);
      Alert.alert('Sign Up Error', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Function to navigate to Login (can still be used by the link)
  const goToLogin = () => {
      navigation.navigate('AuthPage'); // Use navigate here too
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <LinearGradient
        colors={['#fe9494', '#00008b']} // Screen background gradient
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Replace View with LinearGradient for the card */}
          <LinearGradient
            colors={['#fe9494', '#00008b']} // Card background gradient - same colors
            style={styles.card} // Apply existing card styles (borderRadius, padding, shadow, etc.)
          >
            {/* --- Header, Content (Inputs) remain the same --- */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.description}>
                Join us! Fill in the details below to get started.
              </Text>
            </View>

            <View style={styles.content}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholderTextColor="#aaa" // This color might need adjustment for contrast on gradient
                />
              </View>

              {/* USERNAME INPUT REMOVED
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username (min 3 chars)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#aaa" // This color might need adjustment
                />
              </View>
              */}

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#aaa" // This color might need adjustment
                />
              </View>
            </View>


            <View style={styles.footer}>
              {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                      <Text style={styles.buttonTextPrimary}>Create Account</Text>
                  )}
                </TouchableOpacity>

              {/* Link to Login */}
              <TouchableOpacity
                  style={styles.linkButton}
                  onPress={goToLogin} // Use navigation function here too
                  activeOpacity={0.7}
              >
                  <Text style={styles.linkText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// Styles
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
    // backgroundColor: '#f8f9fa', // Already removed
  },
  card: {
    width: '100%',
    maxWidth: 400,
    // backgroundColor: '#ffffff', // REMOVE this to allow gradient to show
    borderRadius: 12, // Important for the gradient to have rounded corners
    padding: 24,      // Padding will apply to the content within the gradient
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
    color: '#FFFFFF', // CHANGED for better contrast on dark gradient, adjust as needed
    // color: '#333', // Original color
  },
  description: {
    fontSize: 14,
    color: '#F0F0F0', // CHANGED for better contrast, adjust as needed
    // color: '#6c757d', // Original color
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
    color: '#FFFFFF', // CHANGED for better contrast, adjust as needed
    // color: '#495057', // Original color
    marginBottom: 6,
  },
  input: { // Inputs will likely need their own background or text color adjustments
    borderWidth: 1,
    borderColor: '#ced4da', // This border might be hard to see on the gradient
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent white for inputs
    color: '#FFFFFF', // Text color for input
    // backgroundColor: '#fff', // Original background
    // color: '#333' // Original text color
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
    backgroundColor: '#FF6347', // This button color might be fine, or you might want to adjust
  },
  buttonDisabled: {
    backgroundColor: '#FF6347',
    opacity: 0.7,
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#ADD8E6', // Lighter blue/link color for contrast
    // color: '#FF6347', // Original color
    textDecorationLine: 'underline',
  }
});