// utils/kmeans.js
const { UserActivity } = require('../models/user-activity');
const { Product } = require('../models/product');
const { Category } = require('../models/category');

// Hàm tính khoảng cách Euclidean giữa hai vector
function euclideanDistance(vector1, vector2) {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let sum = 0;
  for (let i = 0; i < vector1.length; i++) {
    sum += Math.pow(vector1[i] - vector2[i], 2);
  }
  
  return Math.sqrt(sum);
}

// Hàm khởi tạo các tâm cụm ngẫu nhiên
function initializeCentroids(data, k) {
  // Chọn k điểm ngẫu nhiên từ dữ liệu làm tâm cụm ban đầu
  const centroids = [];
  const dataLength = data.length;
  
  // Đảm bảo k không lớn hơn số lượng dữ liệu
  k = Math.min(k, dataLength);
  
  // Chọn k điểm ngẫu nhiên không trùng lặp
  const indexes = new Set();
  while (indexes.size < k) {
    const randomIndex = Math.floor(Math.random() * dataLength);
    indexes.add(randomIndex);
  }
  
  // Tạo các tâm cụm từ các điểm được chọn
  for (const index of indexes) {
    centroids.push([...data[index]]);
  }
  
  return centroids;
}

// Hàm gán các điểm vào cụm gần nhất
function assignToClusters(data, centroids) {
  const clusters = Array(centroids.length).fill().map(() => []);
  
  data.forEach((point, pointIndex) => {
    let minDistance = Infinity;
    let clusterIndex = 0;
    
    // Tìm tâm cụm gần nhất
    centroids.forEach((centroid, index) => {
      const distance = euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        clusterIndex = index;
      }
    });
    
    // Gán điểm vào cụm
    clusters[clusterIndex].push(pointIndex);
  });
  
  return clusters;
}

// Hàm cập nhật tâm cụm
function updateCentroids(data, clusters) {
  return clusters.map(cluster => {
    // Nếu cụm rỗng, giữ nguyên tâm cụm
    if (cluster.length === 0) return null;
    
    // Tính trung bình các điểm trong cụm
    const dimensions = data[0].length;
    const centroid = Array(dimensions).fill(0);
    
    cluster.forEach(pointIndex => {
      const point = data[pointIndex];
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += point[i];
      }
    });
    
    // Lấy giá trị trung bình
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= cluster.length;
    }
    
    return centroid;
  });
}

// Hàm kiểm tra hội tụ
function hasConverged(oldCentroids, newCentroids, threshold = 0.001) {
  if (!oldCentroids || !newCentroids) return false;
  
  return oldCentroids.every((oldCentroid, i) => {
    if (!newCentroids[i]) return true; // Bỏ qua cụm rỗng
    return euclideanDistance(oldCentroid, newCentroids[i]) < threshold;
  });
}

// Hàm chính thực hiện thuật toán K-means
async function kMeans(data, k, maxIterations = 100) {
  if (data.length === 0) return { clusters: [], centroids: [] };
  
  let centroids = initializeCentroids(data, k);
  let clusters;
  let converged = false;
  let iterations = 0;
  
  while (!converged && iterations < maxIterations) {
    // Gán các điểm vào cụm
    clusters = assignToClusters(data, centroids);
    
    // Cập nhật tâm cụm
    const newCentroids = updateCentroids(data, clusters);
    
    // Kiểm tra hội tụ
    converged = hasConverged(centroids, newCentroids);
    centroids = newCentroids;
    
    iterations++;
  }
  
  console.log(`K-means completed in ${iterations} iterations`);
  return { clusters, centroids };
}

// Hàm chuẩn bị dữ liệu người dùng cho K-means
async function prepareUserFeatures() {
  try {
    // Lấy tất cả danh mục
    const categories = await Category.find();
    const categoryMap = {};
    categories.forEach((category, index) => {
      categoryMap[category.id] = index;
    });
    
    // Lấy hoạt động của tất cả người dùng
    const userActivities = await UserActivity.find()
      .populate('user')
      .populate('product')
      .populate('category');
    
    // Nhóm hoạt động theo người dùng
    const userMap = {};
    userActivities.forEach(activity => {
      if (!activity.user || !activity.user.id) {
        console.log('Skipping activity with missing user ID');
        return;
      }
      
      const userId = activity.user.id;
      
      if (!userMap[userId]) {
        userMap[userId] = {
          userId,
          categoryInterests: Array(categories.length).fill(0),
          priceRanges: [0, 0, 0, 0, 0], // 5 khoảng giá
          behaviors: [0, 0, 0] // [viewCount, cartAddCount, purchaseCount]
        };
      }
      
      // Cập nhật mức độ quan tâm đến danh mục
      if (activity.category && categoryMap[activity.category.id] !== undefined) {
        const categoryIndex = categoryMap[activity.category.id];
        const interestScore = activity.viewCount * 0.2 + activity.cartAddCount * 0.3 + activity.purchaseCount * 0.5;
        userMap[userId].categoryInterests[categoryIndex] += interestScore;
      }
      
      // Cập nhật khoảng giá
      if (activity.product && activity.product.price !== undefined) {
        const price = activity.product.price;
        let priceIndex;
        if (price < 20) priceIndex = 0;
        else if (price < 50) priceIndex = 1;
        else if (price < 100) priceIndex = 2;
        else if (price < 200) priceIndex = 3;
        else priceIndex = 4;
        
        const interestScore = activity.viewCount * 0.2 + activity.cartAddCount * 0.3 + activity.purchaseCount * 0.5;
        userMap[userId].priceRanges[priceIndex] += interestScore;
      }
      
      // Cập nhật hành vi
      userMap[userId].behaviors[0] += activity.viewCount;
      userMap[userId].behaviors[1] += activity.cartAddCount;
      userMap[userId].behaviors[2] += activity.purchaseCount;
    });
    
    // Chuẩn hóa dữ liệu
    const userFeatures = [];
    const userIds = [];
    
    Object.values(userMap).forEach(user => {
      // Chuẩn hóa vector đặc trưng
      const features = [
        ...normalizeVector(user.categoryInterests),
        ...normalizeVector(user.priceRanges),
        ...normalizeVector(user.behaviors)
      ];
      
      userFeatures.push(features);
      userIds.push(user.userId);
    });
    
    console.log(`Prepared features for ${userIds.length} users`);
    return { userFeatures, userIds };
  } catch (error) {
    console.error('Error preparing user features:', error);
    return { userFeatures: [], userIds: [] };
  }
}

// Hàm chuẩn hóa vector
function normalizeVector(vector) {
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum === 0) return vector; // Tránh chia cho 0
  
  return vector.map(value => value / sum);
}

// Hàm tạo đề xuất cho người dùng
async function generateRecommendations(userId, numberOfRecommendations = 10) {
  try {
    console.log(`Generating recommendations for user ${userId}`);
    
    // Chuẩn bị dữ liệu
    const { userFeatures, userIds } = await prepareUserFeatures();
    
    // Nếu không có dữ liệu hoặc chỉ có 1 người dùng, trả về sản phẩm phổ biến
    if (userFeatures.length <= 1) {
      console.log('Not enough user data for clustering, returning popular products');
      return getPopularProducts(numberOfRecommendations);
    }
    
    // Tìm index của người dùng
    const userIndex = userIds.indexOf(userId);
    
    // Nếu không tìm thấy người dùng, trả về sản phẩm phổ biến
    if (userIndex === -1) {
      console.log('User not found in dataset, returning popular products');
      return getPopularProducts(numberOfRecommendations);
    }
    
    // Phân cụm người dùng (k = 3 hoặc số người dùng nếu nhỏ hơn 3)
    const k = Math.min(3, userFeatures.length);
    console.log(`Clustering ${userFeatures.length} users into ${k} clusters`);
    const { clusters } = await kMeans(userFeatures, k);
    
    // Tìm cụm chứa người dùng
    let userCluster = -1;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].includes(userIndex)) {
        userCluster = i;
        break;
      }
    }
    
    if (userCluster === -1) {
      console.log('User not assigned to any cluster, returning popular products');
      return getPopularProducts(numberOfRecommendations);
    }
    
    console.log(`User ${userId} belongs to cluster ${userCluster} with ${clusters[userCluster].length} users`);
    
    // Lấy các người dùng trong cùng cụm
    const similarUserIds = clusters[userCluster]
      .filter(index => index !== userIndex)
      .map(index => userIds[index]);
    
    // Nếu không có người dùng tương tự, trả về sản phẩm phổ biến
    if (similarUserIds.length === 0) {
      console.log('No similar users found, returning popular products');
      return getPopularProducts(numberOfRecommendations);
    }
    
    console.log(`Found ${similarUserIds.length} similar users`);
    
    // Lấy sản phẩm phổ biến trong cụm
    const recommendations = await getClusterPopularProducts(similarUserIds, numberOfRecommendations);
    
    // Nếu không có đủ đề xuất, bổ sung bằng sản phẩm phổ biến
    if (recommendations.length < numberOfRecommendations) {
      const remainingCount = numberOfRecommendations - recommendations.length;
      const popularProducts = await getPopularProducts(remainingCount);
      
      // Loại bỏ các sản phẩm đã có trong recommendations
      const existingProductIds = recommendations.map(product => product.id);
      const additionalProducts = popularProducts.filter(
        product => !existingProductIds.includes(product.id)
      );
      
      recommendations.push(...additionalProducts.slice(0, remainingCount));
    }
    
    console.log(`Returning ${recommendations.length} recommended products`);
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return getPopularProducts(numberOfRecommendations);
  }
}

// Hàm lấy sản phẩm phổ biến trong cụm
async function getClusterPopularProducts(userIds, limit) {
  try {
    // Lấy hoạt động của các người dùng trong cụm
    const activities = await UserActivity.find({ user: { $in: userIds } })
      .populate({
        path: 'product',
        populate: { path: 'category' }
      });
    
    // Tính điểm phổ biến cho từng sản phẩm
    const productScores = {};
    activities.forEach(activity => {
      if (!activity.product) return;
      
      const productId = activity.product.id;
      
      if (!productScores[productId]) {
        productScores[productId] = {
          product: activity.product,
          score: 0
        };
      }
      
      // Tính điểm dựa trên hoạt động
      productScores[productId].score += activity.viewCount * 1 + 
                                       activity.cartAddCount * 3 + 
                                       activity.purchaseCount * 5;
    });
    
    // Sắp xếp sản phẩm theo điểm
    const sortedProducts = Object.values(productScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);
    
    console.log(`Found ${sortedProducts.length} popular products in cluster`);
    return sortedProducts;
  } catch (error) {
    console.error('Error getting cluster popular products:', error);
    return [];
  }
}

// Hàm lấy sản phẩm phổ biến (fallback)
async function getPopularProducts(limit) {
  try {
    // Lấy sản phẩm có nhiều lượt mua nhất
    const popularProducts = await Product.find()
      .sort({ numReviews: -1, rating: -1 })
      .limit(limit)
      .populate('category');
    
    console.log(`Found ${popularProducts.length} popular products as fallback`);
    return popularProducts;
  } catch (error) {
    console.error('Error getting popular products:', error);
    return [];
  }
}

module.exports = {
  generateRecommendations
};
